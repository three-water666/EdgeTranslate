import { createWorker } from "tesseract.js";
import Channel from "common/scripts/channel.js";
import { OCR_LANGUAGE_CODES } from "common/scripts/ocr_languages.js";

const OCR_CORE_PATH = chrome.runtime.getURL("ocr/core/tesseract-core-lstm.wasm.js");
const OCR_WORKER_PATH = chrome.runtime.getURL("ocr/worker.min.js");
const OCR_CACHE_DB_NAME = "keyval-store";
const OCR_CACHE_STORE_NAME = "keyval";
const OCR_CACHE_PATH = "edge_translate_ocr";
const OCR_REMOTE_LANG_VERSION = "4.0.0_best_int";
const DEFAULT_OCR_LANGUAGES = ["eng", "chi_sim"];
const SUPPORTED_OCR_LANGUAGES = OCR_LANGUAGE_CODES;
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
                errorType: task?.errorType ?? "",
                source: getOcrDownloadSource(language),
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

export async function cancelOcrLanguageDownloads(languages) {
    const normalizedLanguages = normalizeLanguages(languages);
    if (normalizedLanguages.length === 0) return {};

    await Promise.all(
        normalizedLanguages.map(async (language) => {
            const task = ocrDownloadTasks.get(language);
            if (!task?.controller) return;
            task.controller.abort();
            await task.promise.catch(() => {});
        })
    );

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
                errorType: "",
                source: getOcrDownloadSource(language),
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
    const configuredLanguages =
        settings?.EnabledLanguages || settings?.Languages || DEFAULT_OCR_LANGUAGES;
    const normalizedLanguages = normalizeLanguages(configuredLanguages);
    const activeLanguages = [];

    for (const language of normalizedLanguages) {
        if (await hasCachedOcrLanguage(language)) {
            activeLanguages.push(language);
        }
    }

    return activeLanguages.length > 0 ? activeLanguages : normalizedLanguages;
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
            errorType: "",
            source: getOcrDownloadSource(language),
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
        errorType: "",
        controller: null,
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
        errorType: "",
        source: getOcrDownloadSource(language),
    });

    task.controller = new AbortController();
    task.promise = downloadAndCacheOcrLanguage(language, task.controller.signal)
        .then(() => {
            task.controller = null;
            emitOcrDownloadEvent({
                language,
                downloaded: true,
                downloading: false,
                progress: 100,
                status: "ready",
                error: "",
                errorType: "",
                source: getOcrDownloadSource(language),
            });
        })
        .catch((error) => {
            const errorText = error?.message || String(error);
            task.error = errorText;
            task.errorType = classifyOcrDownloadError(errorText);
            const cancelled = task.errorType === "cancelled";
            emitOcrDownloadEvent({
                language,
                downloaded: false,
                downloading: false,
                progress: cancelled ? 0 : task.progress,
                status: cancelled ? "idle" : "error",
                error: cancelled ? "" : errorText,
                errorType: task.errorType,
                source: getOcrDownloadSource(language),
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
    task.errorType = "";

    emitOcrDownloadEvent({
        language,
        downloaded: false,
        downloading: true,
        progress: mappedProgress.progress,
        status: mappedProgress.status,
        error: "",
        errorType: "",
        source: getOcrDownloadSource(language),
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

function getOcrDownloadSource(language) {
    return `https://cdn.jsdelivr.net/npm/@tesseract.js-data/${language}/${OCR_REMOTE_LANG_VERSION}/${language}.traineddata.gz`;
}

async function downloadAndCacheOcrLanguage(language, signal) {
    const source = getOcrDownloadSource(language);
    updateOcrDownloadProgress(language, {
        status: "initializing tesseract",
        progress: 0,
    });

    const response = await fetch(source, { signal });
    if (!response.ok) {
        throw new Error(
            `Network error while fetching ${source}. Response code: ${response.status}`
        );
    }

    const contentLength = Number(response.headers.get("content-length")) || 0;
    const reader = response.body?.getReader();
    if (!reader) {
        const buffer = new Uint8Array(await response.arrayBuffer());
        await writeCachedOcrLanguage(language, buffer);
        return;
    }

    const chunks = [];
    let receivedLength = 0;

    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (signal.aborted) {
            throw new DOMException("The operation was aborted.", "AbortError");
        }

        chunks.push(value);
        receivedLength += value.length;

        if (contentLength > 0) {
            updateOcrDownloadProgress(language, {
                status: "loading language traineddata",
                progress: receivedLength / contentLength,
            });
        }
    }

    updateOcrDownloadProgress(language, {
        status: "initializing api",
        progress: 1,
    });

    const merged = new Uint8Array(receivedLength);
    let offset = 0;
    for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
    }

    await writeCachedOcrLanguage(language, merged);
}

function writeCachedOcrLanguage(language, data) {
    return withOcrCacheStore("readwrite", (store) => {
        store.put(data, getOcrCacheKey(language));
        return createRequestPromise(store.transaction);
    });
}

function classifyOcrDownloadError(errorText = "") {
    const normalizedText = String(errorText).toLowerCase();
    if (normalizedText.includes("aborterror") || normalizedText.includes("aborted")) {
        return "cancelled";
    }
    if (
        normalizedText.includes("network error") ||
        normalizedText.includes("failed to fetch") ||
        normalizedText.includes("networkerror") ||
        normalizedText.includes("load failed")
    ) {
        return "network";
    }
    if (normalizedText.includes("response code: 404")) {
        return "not_found";
    }
    if (normalizedText.includes("response code: 403")) {
        return "forbidden";
    }
    return "unknown";
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
