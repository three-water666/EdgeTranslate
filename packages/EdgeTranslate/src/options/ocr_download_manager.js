import { OCR_LANGUAGES } from "common/scripts/ocr_languages.js";
import {
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
    toggleOcrLanguageEnabled as persistOcrLanguageEnabled,
    validateOcrLanguageFile,
    writeCachedOcrLanguage,
} from "./ocr_download_manager_store.js";
import {
    captureOcrListRenderState,
    createOcrErrorNode,
    createOcrFilterBar,
    createOcrLanguageCard,
    createOcrSearchInput,
    restoreOcrListRenderState,
} from "./ocr_download_manager_view.js";
import { filterOcrLanguageEntry as filterLanguageEntry } from "./ocr_download_manager_filter.js";
import { importOcrLanguageFile as importOcrLanguageUpload } from "./ocr_download_manager_upload.js";

let ocrDownloadManagerContainer = null;
let ocrLanguageStates = {};
let ocrLanguageSearchQuery = "";
let ocrLanguageQuickFilter = "all";
let ocrLanguageSearchComposing = false;

async function setUpOcrDownloadManager(channel) {
    const container = document.getElementById("ocr-download-manager");
    if (!container) return;
    ocrDownloadManagerContainer = container;

    OCR_LANGUAGES.forEach((language) => {
        ocrLanguageStates[language.code] = createDefaultOcrLanguageState();
    });
    const ocrSettings = await getStoredOcrSettings();
    applyEnabledLanguages(ocrLanguageStates, ocrSettings.EnabledLanguages);
    renderOcrDownloadManager(channel);

    channel.on("ocr_download_state_changed", (detail) => {
        if (!detail?.language || !ocrLanguageStates[detail.language]) return;
        ocrLanguageStates[detail.language] = {
            ...ocrLanguageStates[detail.language],
            ...detail,
        };
        ocrLanguageStates.__globalError = "";
        renderOcrDownloadManager(channel);
    });

    try {
        const status = await channel.request("get_ocr_download_status", {
            languages: OCR_LANGUAGES.map((item) => item.code),
        });
        mergeOcrLanguageStates(ocrLanguageStates, status);
        applyEnabledLanguages(ocrLanguageStates, ocrSettings.EnabledLanguages);
        renderOcrDownloadManager(channel);
    } catch (error) {
        ocrLanguageStates.__globalError = getErrorText(error);
        renderOcrDownloadManager(channel);
    }
}

function renderOcrDownloadManager(channel) {
    const container = ocrDownloadManagerContainer;
    if (!container) return;
    const previousState = captureOcrListRenderState(container);
    container.innerHTML = "";

    container.appendChild(buildOcrSearchInput(channel));
    container.appendChild(buildOcrFilterBar(channel));

    if (ocrLanguageStates.__globalError) {
        container.appendChild(createOcrErrorNode(ocrLanguageStates.__globalError));
    }

    const list = document.createElement("div");
    list.className = "ocr-download-list";
    getOrderedOcrLanguages((language) => filterOcrLanguageEntry(language)).forEach((language) => {
        list.appendChild(buildOcrLanguageCard(channel, language));
    });

    container.appendChild(list);
    restoreOcrListRenderState(container, list, previousState);
}

function buildOcrSearchInput(channel) {
    return createOcrSearchInput({
        getMessageOrFallback,
        onApplyQuery: (query, skipWhileComposing) => {
            if (skipWhileComposing && ocrLanguageSearchComposing) return;
            applyOcrLanguageSearchQuery(query, channel);
        },
        query: ocrLanguageSearchQuery,
        setComposing: (value) => {
            ocrLanguageSearchComposing = value;
        },
        setQuery: (value) => {
            ocrLanguageSearchQuery = value;
        },
    });
}

function buildOcrFilterBar(channel) {
    return createOcrFilterBar({
        filter: ocrLanguageQuickFilter,
        getMessageOrFallback,
        onChangeFilter: (filter) => {
            ocrLanguageQuickFilter = filter;
            renderOcrDownloadManager(channel);
        },
    });
}

function buildOcrLanguageCard(channel, language) {
    const state = ocrLanguageStates[language.code] || createDefaultOcrLanguageState();
    return createOcrLanguageCard({
        appendOcrSourceMeta,
        formatOcrError,
        getDisplayName: getOcrLanguageDisplayName,
        getStatusText: getOcrStatusText,
        language,
        onActions: {
            delete: (languageCode, languageState) =>
                createDeleteOcrActionButton(channel, languageCode, languageState),
            primary: (languageCode, languageState) =>
                createPrimaryOcrActionButton(channel, { code: languageCode }, languageState),
            upload: (languageCode, languageState) =>
                createUploadOcrActionButton(channel, languageCode, languageState),
        },
        state,
    });
}

function createPrimaryOcrActionButton(channel, language, state) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ocr-action-button";
    button.textContent = getPrimaryOcrActionText(state);
    button.onclick = () => handlePrimaryOcrAction(channel, language.code, state);
    return button;
}

function getPrimaryOcrActionText(state) {
    if (state.downloading) {
        return getMessageOrFallback("OCRStopButton", "停止");
    }
    if (state.downloaded) {
        return state.enabled
            ? getMessageOrFallback("OCRDisableButton", "停用")
            : getMessageOrFallback("OCREnableButton", "启用");
    }
    return getMessageOrFallback("OCRDownloadButton", "下载");
}

function handlePrimaryOcrAction(channel, language, state) {
    if (state.downloading) {
        handleOcrLanguageAction(channel, language, "cancel");
        return;
    }
    if (state.downloaded) {
        toggleOcrLanguageEnabled(language, !state.enabled, { channel });
        return;
    }
    handleOcrLanguageAction(channel, language, "download");
}

function createUploadOcrActionButton(channel, language, state) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ocr-action-button secondary";
    button.textContent = getMessageOrFallback("OCRUploadButton", "上传");
    button.disabled = state.downloading || state.downloaded;
    button.onclick = () => importOcrLanguageFile(channel, language);
    return button;
}

function createDeleteOcrActionButton(channel, language, state) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ocr-action-button secondary";
    button.textContent = getMessageOrFallback("OCRDeleteButton", "删除");
    button.disabled = state.downloading || !state.downloaded;
    button.onclick = () => handleOcrLanguageAction(channel, language, "delete");
    return button;
}

function applyOcrLanguageSearchQuery(query, channel) {
    ocrLanguageSearchQuery = query;
    renderOcrDownloadManager(channel);
}

async function handleOcrLanguageAction(channel, language, action) {
    const state = ocrLanguageStates[language];
    if (!state) return;

    ocrLanguageStates.__globalError = "";
    if (action === "cancel") {
        return cancelOcrLanguageAction(channel, language);
    }

    updatePendingOcrLanguageState(language, action, state);
    renderOcrDownloadManager(channel);

    try {
        const requestName =
            action === "download" ? "download_ocr_languages" : "delete_ocr_languages";
        await channel.request(requestName, { languages: [language] });
        await syncOcrLanguageEnabledState(channel, language, action);
        await refreshOcrLanguageState(channel, language);
    } catch (error) {
        ocrLanguageStates[language] = {
            ...ocrLanguageStates[language],
            downloading: false,
            status: "error",
            error: getErrorText(error),
            errorType: "unknown",
        };
        renderOcrDownloadManager(channel);
    }
}

async function cancelOcrLanguageAction(channel, language) {
    try {
        await channel.request("cancel_ocr_language_downloads", { languages: [language] });
        await refreshOcrLanguageState(channel, language);
    } catch (error) {
        ocrLanguageStates[language] = {
            ...ocrLanguageStates[language],
            downloading: false,
            status: "error",
            error: getErrorText(error),
            errorType: "unknown",
        };
        renderOcrDownloadManager(channel);
    }
}

function updatePendingOcrLanguageState(language, action, state) {
    ocrLanguageStates[language] = {
        ...state,
        downloading: action === "download",
        downloaded: action === "delete" ? false : state.downloaded,
        progress: action === "download" ? Math.max(state.progress, 1) : 0,
        status: action === "download" ? "queued" : "idle",
        error: "",
        errorType: "",
    };
}

async function syncOcrLanguageEnabledState(channel, language, action) {
    if (action === "download") {
        await persistOcrLanguageEnabled(ocrLanguageStates, language, true, { silent: true });
    } else if (action === "delete") {
        await persistOcrLanguageEnabled(ocrLanguageStates, language, false, { silent: true });
    }
}

async function refreshOcrLanguageState(channel, language) {
    const status = await channel.request("get_ocr_download_status", { languages: [language] });
    mergeOcrLanguageStates(ocrLanguageStates, status);
    const ocrSettings = await getStoredOcrSettings();
    applyEnabledLanguages(ocrLanguageStates, ocrSettings.EnabledLanguages);
    renderOcrDownloadManager(channel);
}

async function importOcrLanguageFile(channel, language) {
    return importOcrLanguageUpload({
        applyEnabledLanguages,
        channel,
        getErrorText,
        getStoredOcrSettings,
        language,
        ocrLanguageStates,
        refreshLanguageState: refreshOcrLanguageState,
        render: () => renderOcrDownloadManager(channel),
        setImportingState: setImportingOcrLanguageState,
        toggleOcrLanguageEnabled: (nextLanguage, enabled, options = {}) =>
            persistOcrLanguageEnabled(ocrLanguageStates, nextLanguage, enabled, options),
        validateOcrLanguageFile,
        writeCachedOcrLanguage,
    });
}

function setImportingOcrLanguageState(language, state) {
    ocrLanguageStates.__globalError = "";
    ocrLanguageStates[language] = {
        ...state,
        downloading: true,
        progress: 100,
        status: "finalizing",
        error: "",
        errorType: "",
    };
}

function filterOcrLanguageEntry(language) {
    return filterLanguageEntry({
        createDefaultState: createDefaultOcrLanguageState,
        language,
        languageStates: ocrLanguageStates,
        query: ocrLanguageSearchQuery,
        quickFilter: ocrLanguageQuickFilter,
        shouldHideLanguage: shouldHideOcrLanguage,
        toDisplayName: getOcrLanguageDisplayName,
    });
}

async function toggleOcrLanguageEnabled(language, enabled, options = {}) {
    return persistOcrLanguageEnabled(ocrLanguageStates, language, enabled, {
        ...options,
        render: () => renderOcrDownloadManager(options.channel),
    });
}

export { setUpOcrDownloadManager };
