import { createWorker } from "tesseract.js";
import Channel from "common/scripts/channel.js";
import { OCR_LANGUAGE_CODES } from "common/scripts/ocr_languages.js";
import {
    classifyOcrDownloadError,
    downloadAndCacheOcrLanguage as downloadAndCacheOcrLanguageData,
    getOcrDownloadSource as buildOcrDownloadSource,
} from "./ocr_download.js";
import { cropImage } from "./ocr_image.js";
import { recognizeOcrImage } from "./ocr_recognition.js";
import { createOcrCacheApi } from "./ocr_cache.js";

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
const ocrCache = createOcrCacheApi({
    dbName: OCR_CACHE_DB_NAME,
    storeName: OCR_CACHE_STORE_NAME,
    cachePath: OCR_CACHE_PATH,
});

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
                downloaded: await ocrCache.hasCachedLanguage(language),
                downloading: Boolean(task),
                progress: task?.progress ?? 0,
                status: task?.status ?? "idle",
                error: task?.error ?? "",
                errorType: task?.errorType ?? "",
                source: buildOcrDownloadSource(language, OCR_REMOTE_LANG_VERSION),
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
            await ocrCache.deleteCachedLanguage(language);
            emitOcrDownloadEvent({
                language,
                downloaded: false,
                downloading: false,
                progress: 0,
                status: "idle",
                error: "",
                errorType: "",
                source: buildOcrDownloadSource(language, OCR_REMOTE_LANG_VERSION),
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
    return recognizeOcrImage(worker, croppedImage, rect);
}

async function getOcrLanguages() {
    const settings = await channel.request("get_ocr_settings");
    const configuredLanguages =
        settings?.EnabledLanguages || settings?.Languages || DEFAULT_OCR_LANGUAGES;
    const normalizedLanguages = normalizeLanguages(configuredLanguages);
    const activeLanguages = [];

    for (const language of normalizedLanguages) {
        if (await ocrCache.hasCachedLanguage(language)) {
            activeLanguages.push(language);
        }
    }

    return activeLanguages.length > 0 ? activeLanguages : normalizedLanguages;
}

async function ensureLanguagesDownloaded(languages) {
    const missingLanguages = [];

    for (const language of normalizeLanguages(languages)) {
        if (!(await ocrCache.hasCachedLanguage(language))) {
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

async function ensureOcrLanguageDownloaded(language) {
    if (await ocrCache.hasCachedLanguage(language)) {
        emitOcrDownloadEvent({
            language,
            downloaded: true,
            downloading: false,
            progress: 100,
            status: "ready",
            error: "",
            errorType: "",
            source: buildOcrDownloadSource(language, OCR_REMOTE_LANG_VERSION),
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
        source: buildOcrDownloadSource(language, OCR_REMOTE_LANG_VERSION),
    });

    task.controller = new AbortController();
    task.promise = downloadAndCacheOcrLanguageData({
        language,
        signal: task.controller.signal,
        remoteLangVersion: OCR_REMOTE_LANG_VERSION,
        updateProgress: updateOcrDownloadProgress,
        writeCache: ocrCache.writeCachedLanguage,
    })
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
                source: buildOcrDownloadSource(language, OCR_REMOTE_LANG_VERSION),
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
                source: buildOcrDownloadSource(language, OCR_REMOTE_LANG_VERSION),
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
        source: buildOcrDownloadSource(language, OCR_REMOTE_LANG_VERSION),
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
