import Channel from "common/scripts/channel.js";
import { i18nHTML } from "common/scripts/common.js";
import { OCR_LANGUAGES } from "common/scripts/ocr_languages.js";
import { DEFAULT_SETTINGS, getOrSetDefaultSettings } from "common/scripts/settings.js";

/**
 * Communication channel.
 */
const channel = new Channel();
const OCR_CACHE_DB_NAME = "keyval-store";
const OCR_CACHE_STORE_NAME = "keyval";
const OCR_CACHE_PATH = "edge_translate_ocr";
let ocrDownloadManagerContainer = null;
let ocrLanguageStates = {};
let ocrLanguageSearchQuery = "";
let ocrLanguageQuickFilter = "all";
let ocrLanguageSearchComposing = false;
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

/**
 * 初始化设置列表
 */
window.onload = () => {
    i18nHTML();
    setUpOcrDownloadManager();
    scrollToHashTarget();

    /**
     * Set up hybrid translate config.
     */
    getOrSetDefaultSettings(["languageSetting", "HybridTranslatorConfig"], DEFAULT_SETTINGS).then(
        async (result) => {
            let config = result.HybridTranslatorConfig;
            let languageSetting = result.languageSetting;
            let availableTranslators = await channel.request("get_available_translators", {
                from: languageSetting.sl,
                to: languageSetting.tl,
            });
            setUpTranslateConfig(
                config,
                // Remove the hybrid translator at the beginning of the availableTranslators array.
                availableTranslators.slice(1)
            );
        }
    );

    /**
     * Update translator config options on translator config update.
     */
    channel.on("hybrid_translator_config_updated", (detail) =>
        setUpTranslateConfig(detail.config, detail.availableTranslators)
    );

    /**
     * initiate and update settings
     * attribute "setting-type": indicate the setting type of one option
     * attribute "setting-path": indicate the nested setting path. used to locate the path of one setting item in chrome storage
     */
    getOrSetDefaultSettings(undefined, DEFAULT_SETTINGS).then((result) => {
        const settingElements = document.querySelectorAll("[setting-path]");
        for (let element of settingElements) {
            let settingItemPath = element.getAttribute("setting-path").split(/\s/g);
            let settingItemValue = getSetting(result, settingItemPath);

            switch (element.getAttribute("setting-type")) {
                case "checkbox":
                    element.checked = settingItemValue.indexOf(element.value) !== -1;
                    // update setting value
                    element.onchange = (event) => {
                        const target = event.target;
                        const settingItemPath = target.getAttribute("setting-path").split(/\s/g);
                        const settingItemValue = getSetting(result, settingItemPath);
                        // if user checked this option, add value to setting array
                        if (target.checked) settingItemValue.push(target.value);
                        // if user unchecked this option, delete value from setting array
                        else {
                            settingItemValue.splice(settingItemValue.indexOf(target.value), 1);
                        }
                        saveOption(result, settingItemPath, settingItemValue);
                    };
                    break;
                case "radio":
                    element.checked = settingItemValue === element.value;
                    // update setting value
                    element.onchange = (event) => {
                        const target = event.target;
                        const settingItemPath = target.getAttribute("setting-path").split(/\s/g);
                        if (target.checked) {
                            saveOption(result, settingItemPath, target.value);
                        }
                    };
                    break;
                case "switch":
                    element.checked = settingItemValue;
                    // update setting value
                    element.onchange = (event) => {
                        const settingItemPath = event.target
                            .getAttribute("setting-path")
                            .split(/\s/g);
                        saveOption(result, settingItemPath, event.target.checked);
                    };
                    break;
                case "select":
                    element.value = settingItemValue;
                    // update setting value
                    element.onchange = (event) => {
                        const target = event.target;
                        const settingItemPath = target.getAttribute("setting-path").split(/\s/g);
                        saveOption(
                            result,
                            settingItemPath,
                            target.options[target.selectedIndex].value
                        );
                    };
                    break;
                default:
                    break;
            }
        }
    });
};

function scrollToHashTarget() {
    if (!window.location.hash) return;

    requestAnimationFrame(() => {
        const target = document.querySelector(window.location.hash);
        if (!target) return;
        target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
}

async function setUpOcrDownloadManager() {
    const container = document.getElementById("ocr-download-manager");
    if (!container) return;
    ocrDownloadManagerContainer = container;

    let ocrSettings = null;
    OCR_LANGUAGES.forEach((language) => {
        ocrLanguageStates[language.code] = createDefaultOcrLanguageState();
    });
    ocrSettings = await getStoredOcrSettings();
    applyEnabledLanguages(ocrSettings.EnabledLanguages);
    renderOcrDownloadManager();

    channel.on("ocr_download_state_changed", (detail) => {
        if (!detail?.language || !ocrLanguageStates[detail.language]) return;
        ocrLanguageStates[detail.language] = {
            ...ocrLanguageStates[detail.language],
            ...detail,
        };
        ocrLanguageStates.__globalError = "";
        renderOcrDownloadManager();
    });

    try {
        const status = await channel.request("get_ocr_download_status", {
            languages: OCR_LANGUAGES.map((item) => item.code),
        });
        mergeOcrLanguageStates(status);
        applyEnabledLanguages(ocrSettings.EnabledLanguages);
        renderOcrDownloadManager();
    } catch (error) {
        ocrLanguageStates.__globalError = getErrorText(error);
        renderOcrDownloadManager();
    }
}

function renderOcrDownloadManager() {
    const container = ocrDownloadManagerContainer;
    if (!container) return;
    const previousList = container.querySelector(".ocr-download-list");
    const previousListScrollTop = previousList ? previousList.scrollTop : 0;
    const activeElement = document.activeElement;
    const shouldRestoreSearchFocus = activeElement?.classList?.contains("ocr-search-input");
    const selectionStart = shouldRestoreSearchFocus ? activeElement.selectionStart : null;
    const selectionEnd = shouldRestoreSearchFocus ? activeElement.selectionEnd : null;
    container.innerHTML = "";

    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.className = "ocr-search-input";
    searchInput.placeholder = getMessageOrFallback("OCRSearchPlaceholder", "搜索语言或代码");
    searchInput.value = ocrLanguageSearchQuery;
    searchInput.oncompositionstart = () => {
        ocrLanguageSearchComposing = true;
    };
    searchInput.oncompositionend = (event) => {
        ocrLanguageSearchComposing = false;
        window.setTimeout(() => {
            applyOcrLanguageSearchQuery(event.target.value || "");
        }, 0);
    };
    searchInput.oninput = (event) => {
        const nextQuery = event.target.value || "";
        ocrLanguageSearchQuery = nextQuery;
        if (ocrLanguageSearchComposing || event.isComposing) return;
        applyOcrLanguageSearchQuery(nextQuery);
    };
    searchInput.onkeydown = (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        applyOcrLanguageSearchQuery(event.target.value || "");
    };
    container.appendChild(searchInput);

    const filterBar = document.createElement("div");
    filterBar.className = "ocr-filter-bar";
    [
        { key: "all", labelKey: "OCRFilterAll", fallback: "全部" },
        { key: "downloaded", labelKey: "OCRFilterDownloaded", fallback: "已下载" },
        { key: "enabled", labelKey: "OCRFilterEnabled", fallback: "已启用" },
        { key: "not_downloaded", labelKey: "OCRFilterNotDownloaded", fallback: "未下载" },
    ].forEach((item) => {
        const filterButton = document.createElement("button");
        filterButton.type = "button";
        filterButton.className = `ocr-filter-chip${
            ocrLanguageQuickFilter === item.key ? " active" : ""
        }`;
        filterButton.textContent = getMessageOrFallback(item.labelKey, item.fallback);
        filterButton.onclick = () => {
            ocrLanguageQuickFilter = item.key;
            renderOcrDownloadManager();
        };
        filterBar.appendChild(filterButton);
    });
    container.appendChild(filterBar);

    if (ocrLanguageStates.__globalError) {
        const errorNode = document.createElement("div");
        errorNode.className = "ocr-download-error";
        errorNode.textContent = ocrLanguageStates.__globalError;
        container.appendChild(errorNode);
    }

    const list = document.createElement("div");
    list.className = "ocr-download-list";

    getOrderedOcrLanguages().forEach((language) => {
        const state = ocrLanguageStates[language.code] || createDefaultOcrLanguageState();
        const card = document.createElement("div");
        card.className = "ocr-download-card";

        const row = document.createElement("div");
        row.className = "ocr-download-row";

        const title = document.createElement("span");
        title.className = "ocr-download-title";
        title.textContent = getOcrLanguageDisplayName(language);
        row.appendChild(title);

        const status = document.createElement("span");
        status.className = "ocr-download-status";
        status.textContent = getOcrStatusText(state);
        row.appendChild(status);

        const actions = document.createElement("div");
        actions.className = "ocr-download-actions";

        const primaryButton = document.createElement("button");
        primaryButton.type = "button";
        primaryButton.className = "ocr-action-button";
        primaryButton.textContent = state.downloading
            ? getMessageOrFallback("OCRStopButton", "停止")
            : state.downloaded
            ? state.enabled
                ? getMessageOrFallback("OCRDisableButton", "停用")
                : getMessageOrFallback("OCREnableButton", "启用")
            : getMessageOrFallback("OCRDownloadButton", "下载");
        primaryButton.onclick = () => {
            if (state.downloading) {
                handleOcrLanguageAction(language.code, "cancel");
                return;
            }
            if (state.downloaded) {
                toggleOcrLanguageEnabled(language.code, !state.enabled);
                return;
            }
            handleOcrLanguageAction(language.code, "download");
        };
        actions.appendChild(primaryButton);

        const uploadButton = document.createElement("button");
        uploadButton.type = "button";
        uploadButton.className = "ocr-action-button secondary";
        uploadButton.textContent = getMessageOrFallback("OCRUploadButton", "上传");
        uploadButton.disabled = state.downloading || state.downloaded;
        uploadButton.onclick = () => openOcrFilePicker(language.code);
        actions.appendChild(uploadButton);

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "ocr-action-button secondary";
        deleteButton.textContent = getMessageOrFallback("OCRDeleteButton", "删除");
        deleteButton.disabled = state.downloading || !state.downloaded;
        deleteButton.onclick = () => handleOcrLanguageAction(language.code, "delete");
        actions.appendChild(deleteButton);

        row.appendChild(actions);
        card.appendChild(row);

        const meta = document.createElement("div");
        meta.className = "ocr-download-meta";
        appendOcrSourceMeta(meta, state);
        card.appendChild(meta);

        if (state.downloading) {
            const progress = document.createElement("div");
            progress.className = "ocr-download-progress";
            progress.innerHTML = `<div class="ocr-download-progress-bar" style="width:${state.progress}%"></div>`;
            card.appendChild(progress);
        }

        if (state.error) {
            const inlineError = document.createElement("div");
            inlineError.className = "ocr-download-error inline";
            inlineError.textContent = formatOcrError(state);
            card.appendChild(inlineError);
        }
        list.appendChild(card);
    });

    container.appendChild(list);
    list.scrollTop = previousListScrollTop;

    if (shouldRestoreSearchFocus) {
        const nextSearchInput = container.querySelector(".ocr-search-input");
        if (nextSearchInput) {
            nextSearchInput.focus();
            if (
                typeof selectionStart === "number" &&
                typeof selectionEnd === "number" &&
                nextSearchInput.setSelectionRange
            ) {
                nextSearchInput.setSelectionRange(selectionStart, selectionEnd);
            }
        }
    }
}

function applyOcrLanguageSearchQuery(query) {
    ocrLanguageSearchQuery = query;
    renderOcrDownloadManager();
}

function getOrderedOcrLanguages() {
    const commonLanguagePriority = new Map(
        OCR_COMMON_LANGUAGE_CODES.map((code, index) => [code, index])
    );

    return OCR_LANGUAGES.filter(filterOcrLanguageEntry).sort((a, b) => {
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

async function handleOcrLanguageAction(language, action) {
    const state = ocrLanguageStates[language];
    if (!state) return;

    ocrLanguageStates.__globalError = "";
    if (action === "cancel") {
        try {
            await channel.request("cancel_ocr_language_downloads", { languages: [language] });
            const status = await channel.request("get_ocr_download_status", {
                languages: [language],
            });
            mergeOcrLanguageStates(status);
            const ocrSettings = await getStoredOcrSettings();
            applyEnabledLanguages(ocrSettings.EnabledLanguages);
            renderOcrDownloadManager();
        } catch (error) {
            ocrLanguageStates[language] = {
                ...ocrLanguageStates[language],
                downloading: false,
                status: "error",
                error: getErrorText(error),
                errorType: "unknown",
            };
            renderOcrDownloadManager();
        }
        return;
    }

    ocrLanguageStates[language] = {
        ...state,
        downloading: action === "download",
        downloaded: action === "delete" ? false : state.downloaded,
        progress: action === "download" ? Math.max(state.progress, 1) : 0,
        status: action === "download" ? "queued" : "idle",
        error: "",
        errorType: "",
    };
    renderOcrDownloadManager();

    try {
        const requestName =
            action === "download" ? "download_ocr_languages" : "delete_ocr_languages";
        await channel.request(requestName, { languages: [language] });
        if (action === "download") {
            await toggleOcrLanguageEnabled(language, true, { silent: true });
        } else if (action === "delete") {
            await toggleOcrLanguageEnabled(language, false, { silent: true });
        }
        const status = await channel.request("get_ocr_download_status", { languages: [language] });
        mergeOcrLanguageStates(status);
        const ocrSettings = await getStoredOcrSettings();
        applyEnabledLanguages(ocrSettings.EnabledLanguages);
        renderOcrDownloadManager();
    } catch (error) {
        ocrLanguageStates[language] = {
            ...ocrLanguageStates[language],
            downloading: false,
            status: "error",
            error: getErrorText(error),
            errorType: "unknown",
        };
        renderOcrDownloadManager();
    }
}

function openOcrFilePicker(language) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".traineddata,.gz,application/octet-stream,application/gzip";
    input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        await importOcrLanguageFile(language, file);
    };
    input.click();
}

async function importOcrLanguageFile(language, file) {
    const state = ocrLanguageStates[language];
    if (!state) return;

    try {
        validateOcrLanguageFile(language, file);

        ocrLanguageStates.__globalError = "";
        ocrLanguageStates[language] = {
            ...state,
            downloading: true,
            progress: 100,
            status: "finalizing",
            error: "",
            errorType: "",
        };
        renderOcrDownloadManager();

        const buffer = new Uint8Array(await file.arrayBuffer());
        await writeCachedOcrLanguage(language, buffer);
        const status = await channel.request("get_ocr_download_status", { languages: [language] });
        mergeOcrLanguageStates(status);
        await toggleOcrLanguageEnabled(language, true, { silent: true });
        const ocrSettings = await getStoredOcrSettings();
        applyEnabledLanguages(ocrSettings.EnabledLanguages);
        ocrLanguageStates[language] = {
            ...ocrLanguageStates[language],
            source: file.name,
        };
        renderOcrDownloadManager();
    } catch (error) {
        ocrLanguageStates[language] = {
            ...ocrLanguageStates[language],
            downloading: false,
            status: "error",
            error: getErrorText(error),
            errorType: error?.type || "unknown",
        };
        renderOcrDownloadManager();
    }
}

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

function mergeOcrLanguageStates(statusMap = {}) {
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

    const sourceText = document.createElement("span");
    sourceText.textContent = `${sourceLabel}: `;
    container.appendChild(sourceText);

    if (state.source && /^https?:\/\//.test(state.source)) {
        const sourceLink = document.createElement("a");
        sourceLink.className = "ocr-download-link";
        sourceLink.href = state.source;
        sourceLink.target = "_blank";
        sourceLink.rel = "noreferrer";
        sourceLink.textContent = getMessageOrFallback("OCROpenSourceLink", "打开下载地址");
        container.appendChild(sourceLink);
    } else {
        const sourceValue = document.createElement("span");
        sourceValue.textContent =
            state.source || getMessageOrFallback("OCRStateUnknown", "unknown");
        container.appendChild(sourceValue);
    }

    const separator = document.createElement("span");
    separator.textContent = " | ";
    container.appendChild(separator);

    const stateNode = document.createElement("span");
    stateNode.textContent = stateText;
    container.appendChild(stateNode);
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

function applyEnabledLanguages(enabledLanguages = []) {
    const enabledSet = new Set(enabledLanguages);
    OCR_LANGUAGES.forEach(({ code }) => {
        const state = ocrLanguageStates[code] || createDefaultOcrLanguageState();
        ocrLanguageStates[code] = {
            ...state,
            enabled: state.downloaded && enabledSet.has(code),
        };
    });
}

function isSupportedOcrLanguage(language) {
    return OCR_LANGUAGES.some((item) => item.code === language);
}

function filterOcrLanguageEntry(language) {
    if (shouldHideOcrLanguage(language)) return false;
    if (!matchOcrLanguageQuickFilter(language)) return false;
    return filterOcrLanguageByQuery(language);
}

function filterOcrLanguageByQuery(language) {
    const query = ocrLanguageSearchQuery.trim().toLowerCase();
    if (!query) return true;
    const displayName = getOcrLanguageDisplayName(language).toLowerCase();
    const englishLabel = language.label.toLowerCase();
    const aliases = Array.isArray(language.aliases)
        ? language.aliases.map((item) => item.toLowerCase())
        : [];
    return (
        displayName.includes(query) ||
        englishLabel.includes(query) ||
        language.code.toLowerCase().includes(query) ||
        aliases.some((alias) => alias.includes(query))
    );
}

function matchOcrLanguageQuickFilter(language) {
    const state = ocrLanguageStates[language.code] || createDefaultOcrLanguageState();
    switch (ocrLanguageQuickFilter) {
        case "downloaded":
            return state.downloaded;
        case "enabled":
            return state.downloaded && state.enabled;
        case "not_downloaded":
            return !state.downloaded;
        default:
            return true;
    }
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

async function toggleOcrLanguageEnabled(language, enabled, options = {}) {
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
    applyEnabledLanguages(nextSettings.EnabledLanguages);
    if (!options.silent) {
        renderOcrDownloadManager();
    }
}

/**
 * Set up hybrid translate config.
 *
 * @param {Object} config translator config
 * @param {Array<String>} availableTranslators available translators for current language setting
 *
 * @returns {void} nothing
 */
function setUpTranslateConfig(config, availableTranslators) {
    let translatorConfigEles = document.getElementsByClassName("translator-config");

    for (let ele of translatorConfigEles) {
        // Remove existed options.
        for (let i = ele.options.length; i > 0; i--) {
            ele.options.remove(i - 1);
        }

        // data-affected indicates items affected by this element in config.selections, they always have the same value.
        let affected = ele.getAttribute("data-affected").split(/\s/g);
        let selected = config.selections[affected[0]];
        for (let translator of availableTranslators) {
            if (translator === selected) {
                ele.options.add(
                    new Option(chrome.i18n.getMessage(translator), translator, true, true)
                );
            } else {
                ele.options.add(new Option(chrome.i18n.getMessage(translator), translator));
            }
        }

        ele.onchange = () => {
            let value = ele.options[ele.selectedIndex].value;
            // Update every affected item.
            for (let item of affected) {
                config.selections[item] = value;
            }

            // Get the new selected translator set.
            let translators = new Set();
            config.translators = [];
            for (let item in config.selections) {
                let translator = config.selections[item];
                if (!translators.has(translator)) {
                    config.translators.push(translator);
                    translators.add(translator);
                }
            }

            chrome.storage.sync.set({ HybridTranslatorConfig: config });
        };
    }
}

/**
 *
 * get setting value according to path of setting item
 *
 * @param {Object} localSettings setting object stored in local
 * @param {Array} settingItemPath path of the setting item
 * @returns {*} setting value
 */
function getSetting(localSettings, settingItemPath) {
    let result = localSettings;
    settingItemPath.forEach((key) => {
        result = result[key];
    });
    return result;
}

/**
 * 保存一条设置项
 *
 * @param {Object} localSettings  本地存储的设置项
 * @param {Array} settingItemPath 设置项的层级路径
 * @param {*} value 设置项的值
 */
function saveOption(localSettings, settingItemPath, value) {
    // update local settings
    let pointer = localSettings; // point to children of local setting or itself

    // point to the leaf item recursively
    for (let i = 0; i < settingItemPath.length - 1; i++) {
        pointer = pointer[settingItemPath[i]];
    }
    // update the setting leaf value
    pointer[settingItemPath[settingItemPath.length - 1]] = value;

    let result = {};
    result[settingItemPath[0]] = localSettings[settingItemPath[0]];
    chrome.storage.sync.set(result);
}
