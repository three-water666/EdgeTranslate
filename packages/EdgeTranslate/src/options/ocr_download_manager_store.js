import { OCR_LANGUAGES } from "common/scripts/ocr_languages.js";
import { DEFAULT_SETTINGS, getOrSetDefaultSettings } from "common/scripts/settings.js";

const OCR_CACHE_DB_NAME = "keyval-store";
const OCR_CACHE_STORE_NAME = "keyval";
const OCR_CACHE_PATH = "edge_translate_ocr";
const OCR_COMMON_LANGUAGE_CODES = [
    "eng",
    "chi_sim",
    "chi_tra",
    "jpn",
    "kor",
    "fra",
    "deu",
    "spa",
    "rus",
    "ita",
    "por",
    "ara",
    "hin",
    "tha",
    "vie",
];

function writeCachedOcrLanguage(language, data) {
    return withOcrCacheStore("readwrite", (store) => {
        store.put(data, `${OCR_CACHE_PATH}/${language}.traineddata`);
        return createRequestPromise(store.transaction);
    });
}

function validateOcrLanguageFile(language, file) {
    const fileName = file?.name || "";
    const allowedNames = new Set([`${language}.traineddata`, `${language}.traineddata.gz`]);

    if (!allowedNames.has(fileName)) {
        const error = new Error(
            getMessageWithFallback(
                "OCRUploadFileNameMismatch",
                [language, `${language}.traineddata`, `${language}.traineddata.gz`],
                `File name does not match. ${language} requires ${language}.traineddata or ${language}.traineddata.gz`
            )
        );
        error.type = "validation";
        throw error;
    }
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

function createDefaultOcrLanguageState() {
    return {
        downloaded: false,
        enabled: false,
        downloading: false,
        progress: 0,
        status: "idle",
        error: "",
        errorType: "",
        source: "",
    };
}

function mergeOcrLanguageStates(ocrLanguageStates, statusMap = {}) {
    Object.keys(statusMap).forEach((language) => {
        if (!ocrLanguageStates[language]) return;
        ocrLanguageStates[language] = {
            ...ocrLanguageStates[language],
            ...statusMap[language],
        };
    });
}

function getOcrStatusText(state) {
    if (state.downloading) {
        return `${getOcrPhaseText(state.status)} ${state.progress}%`;
    }
    if (state.downloaded) {
        return getMessageOrFallback("OCRStatusDownloaded", "已下载");
    }
    if (state.error) {
        return getMessageOrFallback("OCRStatusFailed", "失败");
    }
    return getMessageOrFallback("OCRStatusNotDownloaded", "未下载");
}

function getOcrPhaseText(status) {
    switch (status) {
        case "queued":
            return getMessageOrFallback("OCRStatusQueued", "排队中");
        case "initializing":
            return getMessageOrFallback("OCRStatusInitializing", "初始化");
        case "downloading":
            return getMessageOrFallback("OCRStatusDownloading", "下载中");
        case "finalizing":
            return getMessageOrFallback("OCRStatusFinalizing", "整理中");
        default:
            return getMessageOrFallback("OCRStatusLoading", "处理中");
    }
}

function getMessageOrFallback(key, fallback) {
    return chrome.i18n.getMessage(key) || fallback;
}

function getErrorText(error) {
    const prefix = getMessageOrFallback("OCRActionFailed", "OCR 资源操作失败");
    const detail = typeof error === "string" ? error : error?.message || String(error);
    return `${prefix}: ${detail}`;
}

function formatOcrError(state) {
    const prefix = getMessageOrFallback("OCRStatusFailed", "失败");
    const typeTextMap = {
        validation: getMessageOrFallback("OCRErrorTypeValidation", "validation"),
        network: getMessageOrFallback("OCRErrorTypeNetwork", "network"),
        not_found: getMessageOrFallback("OCRErrorTypeNotFound", "404"),
        forbidden: getMessageOrFallback("OCRErrorTypeForbidden", "403"),
        cancelled: getMessageOrFallback("OCRErrorTypeCancelled", "cancelled"),
        unknown: getMessageOrFallback("OCRErrorTypeUnknown", "unknown"),
    };
    const typeText =
        typeTextMap[state.errorType] || getMessageOrFallback("OCRErrorTypeUnknown", "unknown");
    const detail = state.error ? ` (${state.error})` : "";
    return `${prefix}: ${typeText}${detail}`;
}

function appendOcrSourceMeta(container, state) {
    const sourceLabel = getMessageOrFallback("OCRSourceLabel", "Source");
    const stateText = state.enabled
        ? getMessageOrFallback("OCRStateEnabled", "Enabled")
        : getMessageOrFallback("OCRStateDisabled", "Disabled");

    appendSourceLabel(container, sourceLabel);
    appendSourceValue(container, state);
    appendTextSpan(container, " | ");
    appendTextSpan(container, stateText);
}

function appendSourceLabel(container, sourceLabel) {
    appendTextSpan(container, `${sourceLabel}: `);
}

function appendSourceValue(container, state) {
    if (state.source && /^https?:\/\//.test(state.source)) {
        const sourceLink = document.createElement("a");
        sourceLink.className = "ocr-download-link";
        sourceLink.href = state.source;
        sourceLink.target = "_blank";
        sourceLink.rel = "noreferrer";
        sourceLink.textContent = getMessageOrFallback("OCROpenSourceLink", "打开下载地址");
        container.appendChild(sourceLink);
        return;
    }

    appendTextSpan(container, state.source || getMessageOrFallback("OCRStateUnknown", "unknown"));
}

function appendTextSpan(container, text) {
    const node = document.createElement("span");
    node.textContent = text;
    container.appendChild(node);
}

function getMessageWithFallback(key, substitutions, fallback) {
    return chrome.i18n.getMessage(key, substitutions) || fallback;
}

async function getStoredOcrSettings() {
    const result = await getOrSetDefaultSettings(["OCRSettings"], DEFAULT_SETTINGS);
    const ocrSettings = result.OCRSettings || {};
    const enabledLanguages = Array.isArray(ocrSettings.EnabledLanguages)
        ? ocrSettings.EnabledLanguages
        : Array.isArray(ocrSettings.Languages)
        ? ocrSettings.Languages
        : DEFAULT_SETTINGS.OCRSettings.EnabledLanguages;
    const normalizedSettings = {
        ...ocrSettings,
        EnabledLanguages: [...new Set(enabledLanguages.filter(isSupportedOcrLanguage))],
    };

    if (
        !Array.isArray(ocrSettings.EnabledLanguages) ||
        JSON.stringify(ocrSettings.EnabledLanguages) !==
            JSON.stringify(normalizedSettings.EnabledLanguages)
    ) {
        chrome.storage.sync.set({ OCRSettings: normalizedSettings });
    }

    return normalizedSettings;
}

function applyEnabledLanguages(ocrLanguageStates, enabledLanguages = []) {
    const enabledSet = new Set(enabledLanguages);
    OCR_LANGUAGES.forEach(({ code }) => {
        const state = ocrLanguageStates[code] || createDefaultOcrLanguageState();
        ocrLanguageStates[code] = {
            ...state,
            enabled: state.downloaded && enabledSet.has(code),
        };
    });
}

function getOrderedOcrLanguages(filterFn) {
    const commonLanguagePriority = new Map(
        OCR_COMMON_LANGUAGE_CODES.map((code, index) => [code, index])
    );

    return OCR_LANGUAGES.filter(filterFn).sort((a, b) => {
        const aPriority = commonLanguagePriority.get(a.code);
        const bPriority = commonLanguagePriority.get(b.code);

        if (aPriority !== undefined || bPriority !== undefined) {
            if (aPriority === undefined) return 1;
            if (bPriority === undefined) return -1;
            return aPriority - bPriority;
        }

        return 0;
    });
}

function isSupportedOcrLanguage(language) {
    return OCR_LANGUAGES.some((item) => item.code === language);
}

function shouldHideOcrLanguage(language) {
    return /\b(old|middle)\b/i.test(language.label);
}

function getOcrLanguageDisplayName(language) {
    const normalizedKey = language.label
        .replace(/[^A-Za-z0-9]+/g, " ")
        .trim()
        .split(/\s+/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join("");
    return chrome.i18n.getMessage(normalizedKey) || language.label;
}

async function toggleOcrLanguageEnabled(ocrLanguageStates, language, enabled, options = {}) {
    const ocrSettings = await getStoredOcrSettings();
    const enabledSet = new Set(ocrSettings.EnabledLanguages || []);
    if (enabled) {
        enabledSet.add(language);
    } else {
        enabledSet.delete(language);
    }

    const nextSettings = {
        ...ocrSettings,
        EnabledLanguages: OCR_LANGUAGES.map((item) => item.code).filter((code) =>
            enabledSet.has(code)
        ),
    };
    await new Promise((resolve) => chrome.storage.sync.set({ OCRSettings: nextSettings }, resolve));
    applyEnabledLanguages(ocrLanguageStates, nextSettings.EnabledLanguages);
    if (!options.silent && options.render) {
        options.render();
    }
}

export {
    appendOcrSourceMeta,
    applyEnabledLanguages,
    createDefaultOcrLanguageState,
    formatOcrError,
    getErrorText,
    getMessageOrFallback,
    getOcrLanguageDisplayName,
    getOcrStatusText,
    getOrderedOcrLanguages,
    getStoredOcrSettings,
    mergeOcrLanguageStates,
    shouldHideOcrLanguage,
    toggleOcrLanguageEnabled,
    validateOcrLanguageFile,
    writeCachedOcrLanguage,
};
