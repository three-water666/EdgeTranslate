import { createWorker } from "tesseract.js";
import Channel from "common/scripts/channel.js";

const OCR_CORE_PATH = chrome.runtime.getURL("ocr/core/tesseract-core-lstm.wasm.js");
const OCR_LANG_PATH = chrome.runtime.getURL("ocr/lang/");
const OCR_WORKER_PATH = chrome.runtime.getURL("ocr/worker.min.js");
const DEFAULT_OCR_LANGUAGES = ["eng", "chi_sim"];
const channel = new Channel();

let ocrWorkerPromise = null;
let ocrWorkerInstance = null;
let currentOcrLanguagesKey = "";

export async function initializeOcrWorker() {
    const languages = await getOcrLanguages();
    const languageKey = languages.join("+");

    if (ocrWorkerPromise && currentOcrLanguagesKey === languageKey) {
        return ocrWorkerPromise;
    }

    if (ocrWorkerInstance && currentOcrLanguagesKey !== languageKey) {
        await ocrWorkerInstance.terminate();
        ocrWorkerInstance = null;
        ocrWorkerPromise = null;
    }

    currentOcrLanguagesKey = languageKey;
    ocrWorkerPromise = createWorker(languageKey, 1, {
        workerPath: OCR_WORKER_PATH,
        langPath: OCR_LANG_PATH,
        corePath: OCR_CORE_PATH,
        gzip: true,
        workerBlobURL: false,
        logger: () => {},
    })
        .then((worker) => {
            ocrWorkerInstance = worker;
            return worker;
        })
        .catch((error) => {
            ocrWorkerPromise = null;
            ocrWorkerInstance = null;
            currentOcrLanguagesKey = "";
            throw error;
        });

    return ocrWorkerPromise;
}

export async function recognizeScreenshotArea({
    screenshotUrl,
    rect,
    viewportWidth,
    viewportHeight,
}) {
    const worker = await initializeOcrWorker();
    const croppedImage = await cropImage(screenshotUrl, rect, viewportWidth, viewportHeight);
    const result = await worker.recognize(croppedImage);
    return normalizeOcrText(result.data.text);
}

async function getOcrLanguages() {
    const settings = await channel.request("get_ocr_settings");
    const languages = settings?.Languages;
    return Array.isArray(languages) && languages.length > 0 ? languages : DEFAULT_OCR_LANGUAGES;
}

async function cropImage(screenshotUrl, rect, viewportWidth, viewportHeight) {
    const image = await loadImage(screenshotUrl);
    const scaleX = image.naturalWidth / viewportWidth;
    const scaleY = image.naturalHeight / viewportHeight;
    const sourceX = Math.max(0, Math.floor(rect.left * scaleX));
    const sourceY = Math.max(0, Math.floor(rect.top * scaleY));
    const sourceWidth = Math.max(1, Math.floor(rect.width * scaleX));
    const sourceHeight = Math.max(1, Math.floor(rect.height * scaleY));
    const upscale = Math.max(
        1,
        Math.min(2, Math.floor(1200 / Math.max(sourceWidth, sourceHeight)))
    );
    const canvas = document.createElement("canvas");
    canvas.width = sourceWidth * upscale;
    canvas.height = sourceHeight * upscale;
    const context = canvas.getContext("2d", { alpha: false });
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        canvas.width,
        canvas.height
    );
    return canvas.toDataURL("image/png");
}

function loadImage(url) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("Failed to load screenshot for OCR."));
        image.src = url;
    });
}

function normalizeOcrText(text) {
    return text
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .join("\n")
        .replace(/[ \t]{2,}/g, " ")
        .trim();
}
