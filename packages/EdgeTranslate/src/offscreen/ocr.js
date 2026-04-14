import { createWorker } from "tesseract.js";
import Channel from "common/scripts/channel.js";

const OCR_CORE_PATH = chrome.runtime.getURL("ocr/core/tesseract-core-lstm.wasm.js");
const OCR_WORKER_PATH = chrome.runtime.getURL("ocr/worker.min.js");
const OCR_CACHE_DB_NAME = "keyval-store";
const OCR_CACHE_STORE_NAME = "keyval";
const OCR_CACHE_PATH = "edge_translate_ocr";
const DEFAULT_OCR_LANGUAGES = ["eng", "chi_sim"];
const SUPPORTED_OCR_LANGUAGES = ["eng", "chi_sim", "jpn", "kor"];
const OCR_DATA_MISSING_PREFIX = "OCR_LANG_DATA_MISSING";
const channel = new Channel();

let ocrWorkerPromise = null;
let ocrWorkerInstance = null;
let currentOcrLanguagesKey = "";
const ocrDownloadTasks = new Map();

export async function getOcrLanguageStatus(languages = SUPPORTED_OCR_LANGUAGES) {
    const normalizedLanguages = normalizeLanguages(languages);
    const result = {};

    await Promise.all(
        normalizedLanguages.map(async (language) => {
            const task = ocrDownloadTasks.get(language);
            result[language] = {
                downloaded: await hasCachedOcrLanguage(language),
                downloading: Boolean(task),
                progress: task?.progress ?? 0,
                status: task?.status ?? "idle",
                error: task?.error ?? "",
            };
        })
    );

    return result;
}

export async function downloadOcrLanguages(languages) {
    const normalizedLanguages = normalizeLanguages(languages);
    if (normalizedLanguages.length === 0) return {};

    await Promise.all(normalizedLanguages.map((language) => ensureOcrLanguageDownloaded(language)));
    return getOcrLanguageStatus(normalizedLanguages);
}

export async function deleteOcrLanguages(languages) {
    const normalizedLanguages = normalizeLanguages(languages);
    if (normalizedLanguages.length === 0) return {};

    await resetOcrWorker();
    await Promise.all(
        normalizedLanguages.map(async (language) => {
            if (ocrDownloadTasks.has(language)) return;
            await deleteCachedOcrLanguage(language);
            emitOcrDownloadEvent({
                language,
                downloaded: false,
                downloading: false,
                progress: 0,
                status: "idle",
                error: "",
            });
        })
    );
    return getOcrLanguageStatus(normalizedLanguages);
}

export async function resetOcrWorker() {
    if (ocrWorkerInstance) {
        await ocrWorkerInstance.terminate();
    } else if (ocrWorkerPromise) {
        const worker = await ocrWorkerPromise.catch(() => null);
        if (worker) {
            await worker.terminate();
        }
    }

    ocrWorkerPromise = null;
    ocrWorkerInstance = null;
    currentOcrLanguagesKey = "";
}

export async function initializeOcrWorker() {
    const languages = await getOcrLanguages();
    await ensureLanguagesDownloaded(languages);
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
        corePath: OCR_CORE_PATH,
        cachePath: OCR_CACHE_PATH,
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

async function ensureLanguagesDownloaded(languages) {
    const missingLanguages = [];

    for (const language of normalizeLanguages(languages)) {
        if (!(await hasCachedOcrLanguage(language))) {
            missingLanguages.push(language);
        }
    }

    if (missingLanguages.length > 0) {
        throw new Error(`${OCR_DATA_MISSING_PREFIX}:${missingLanguages.join(",")}`);
    }
}

function normalizeLanguages(languages) {
    const sourceLanguages = Array.isArray(languages) ? languages : [];
    return [
        ...new Set(
            sourceLanguages.filter((language) => SUPPORTED_OCR_LANGUAGES.includes(language))
        ),
    ];
}

function getOcrCacheKey(language) {
    return `${OCR_CACHE_PATH}/${language}.traineddata`;
}

function hasCachedOcrLanguage(language) {
    return withOcrCacheStore("readonly", (store) => {
        return createRequestPromise(store.get(getOcrCacheKey(language))).then(
            (value) => typeof value !== "undefined"
        );
    });
}

function deleteCachedOcrLanguage(language) {
    return withOcrCacheStore("readwrite", (store) => {
        store.delete(getOcrCacheKey(language));
        return createRequestPromise(store.transaction);
    });
}

function withOcrCacheStore(mode, callback) {
    return openOcrCacheDb().then((db) =>
        callback(db.transaction(OCR_CACHE_STORE_NAME, mode).objectStore(OCR_CACHE_STORE_NAME))
    );
}

function openOcrCacheDb() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(OCR_CACHE_DB_NAME);
        request.onupgradeneeded = () => {
            if (!request.result.objectStoreNames.contains(OCR_CACHE_STORE_NAME)) {
                request.result.createObjectStore(OCR_CACHE_STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function createRequestPromise(request) {
    return new Promise((resolve, reject) => {
        request.oncomplete = request.onsuccess = () => resolve(request.result);
        request.onabort = request.onerror = () => reject(request.error);
    });
}

async function ensureOcrLanguageDownloaded(language) {
    if (await hasCachedOcrLanguage(language)) {
        emitOcrDownloadEvent({
            language,
            downloaded: true,
            downloading: false,
            progress: 100,
            status: "ready",
            error: "",
        });
        return;
    }

    if (ocrDownloadTasks.has(language)) {
        return ocrDownloadTasks.get(language).promise;
    }

    const task = {
        progress: 0,
        status: "queued",
        error: "",
        promise: null,
    };

    ocrDownloadTasks.set(language, task);
    emitOcrDownloadEvent({
        language,
        downloaded: false,
        downloading: true,
        progress: 0,
        status: "queued",
        error: "",
    });

    task.promise = createWorker(language, 1, {
        workerPath: OCR_WORKER_PATH,
        corePath: OCR_CORE_PATH,
        cachePath: OCR_CACHE_PATH,
        gzip: true,
        workerBlobURL: false,
        logger: (detail) => updateOcrDownloadProgress(language, detail),
    })
        .then(async (worker) => {
            await worker.terminate();
            emitOcrDownloadEvent({
                language,
                downloaded: true,
                downloading: false,
                progress: 100,
                status: "ready",
                error: "",
            });
        })
        .catch((error) => {
            const errorText = error?.message || String(error);
            task.error = errorText;
            emitOcrDownloadEvent({
                language,
                downloaded: false,
                downloading: false,
                progress: task.progress,
                status: "error",
                error: errorText,
            });
            throw error;
        })
        .finally(() => {
            ocrDownloadTasks.delete(language);
        });

    return task.promise;
}

function updateOcrDownloadProgress(language, detail = {}) {
    const task = ocrDownloadTasks.get(language);
    if (!task) return;

    const mappedProgress = mapOcrProgress(detail);
    task.progress = mappedProgress.progress;
    task.status = mappedProgress.status;
    task.error = "";

    emitOcrDownloadEvent({
        language,
        downloaded: false,
        downloading: true,
        progress: mappedProgress.progress,
        status: mappedProgress.status,
        error: "",
    });
}

function mapOcrProgress(detail) {
    const rawProgress = clampProgress(detail?.progress ?? 0);
    const rawStatus = detail?.status || "queued";

    switch (rawStatus) {
        case "initializing tesseract":
            return { progress: Math.round(rawProgress * 10), status: "initializing" };
        case "loading language traineddata":
            return { progress: 10 + Math.round(rawProgress * 80), status: "downloading" };
        case "initializing api":
            return { progress: 90 + Math.round(rawProgress * 10), status: "finalizing" };
        default:
            return { progress: Math.round(rawProgress * 100), status: "downloading" };
    }
}

function clampProgress(value) {
    return Math.max(0, Math.min(1, Number(value) || 0));
}

function emitOcrDownloadEvent(detail) {
    channel.emit("ocr_download_state_changed", detail);
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
