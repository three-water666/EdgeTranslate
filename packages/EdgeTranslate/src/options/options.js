import Channel from "common/scripts/channel.js";
import { i18nHTML } from "common/scripts/common.js";
import { DEFAULT_SETTINGS, getOrSetDefaultSettings } from "common/scripts/settings.js";

/**
 * Communication channel.
 */
const channel = new Channel();
const OCR_LANGUAGES = [
    { code: "eng", messageKey: "English" },
    { code: "chi_sim", messageKey: "ChineseSimplified" },
    { code: "jpn", messageKey: "Japanese" },
    { code: "kor", messageKey: "Korean" },
];
let ocrDownloadManagerContainer = null;
let ocrLanguageStates = {};

/**
 * 初始化设置列表
 */
window.onload = () => {
    i18nHTML();
    setUpOcrDownloadManager();

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
        let inputElements = document.getElementsByTagName("input");
        const selectTranslatePositionElement = document.getElementById("select-translate-position");
        for (let element of [...inputElements, selectTranslatePositionElement]) {
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
                        const isOcrLanguageSetting =
                            settingItemPath.join(" ") === "OCRSettings Languages";

                        // if user checked this option, add value to setting array
                        if (target.checked) settingItemValue.push(target.value);
                        // if user unchecked this option, delete value from setting array
                        else {
                            if (isOcrLanguageSetting && settingItemValue.length === 1) {
                                target.checked = true;
                                return;
                            }
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

async function setUpOcrDownloadManager() {
    const container = document.getElementById("ocr-download-manager");
    if (!container) return;
    ocrDownloadManagerContainer = container;

    OCR_LANGUAGES.forEach((language) => {
        ocrLanguageStates[language.code] = createDefaultOcrLanguageState();
    });
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
        renderOcrDownloadManager();
    } catch (error) {
        ocrLanguageStates.__globalError = getErrorText(error);
        renderOcrDownloadManager();
    }
}

function renderOcrDownloadManager() {
    const container = ocrDownloadManagerContainer;
    if (!container) return;
    container.innerHTML = "";

    const note = document.createElement("div");
    note.className = "setting-note";
    note.textContent = getMessageOrFallback(
        "OCRDownloadHint",
        "截图翻译所需语言包不会随扩展安装，按需手动下载到本地缓存；删除后可释放空间。"
    );
    container.appendChild(note);

    if (ocrLanguageStates.__globalError) {
        const errorNode = document.createElement("div");
        errorNode.className = "ocr-download-error";
        errorNode.textContent = ocrLanguageStates.__globalError;
        container.appendChild(errorNode);
    }

    OCR_LANGUAGES.forEach((language) => {
        const state = ocrLanguageStates[language.code] || createDefaultOcrLanguageState();
        const row = document.createElement("div");
        row.className = "ocr-download-row";

        const title = document.createElement("span");
        title.className = "ocr-download-title";
        title.textContent = chrome.i18n.getMessage(language.messageKey) || language.code;
        row.appendChild(title);

        const status = document.createElement("span");
        status.className = "ocr-download-status";
        status.textContent = getOcrStatusText(state);
        row.appendChild(status);

        const actions = document.createElement("div");
        actions.className = "ocr-download-actions";

        const downloadButton = document.createElement("button");
        downloadButton.type = "button";
        downloadButton.className = "ocr-action-button";
        downloadButton.textContent = getMessageOrFallback("OCRDownloadButton", "下载");
        downloadButton.disabled = state.downloading || state.downloaded;
        downloadButton.onclick = () => handleOcrLanguageAction(language.code, "download");
        actions.appendChild(downloadButton);

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "ocr-action-button secondary";
        deleteButton.textContent = getMessageOrFallback("OCRDeleteButton", "删除");
        deleteButton.disabled = state.downloading || !state.downloaded;
        deleteButton.onclick = () => handleOcrLanguageAction(language.code, "delete");
        actions.appendChild(deleteButton);

        row.appendChild(actions);
        container.appendChild(row);

        if (state.downloading) {
            const progress = document.createElement("div");
            progress.className = "ocr-download-progress";
            progress.innerHTML = `<div class="ocr-download-progress-bar" style="width:${state.progress}%"></div>`;
            container.appendChild(progress);
        }

        if (state.error) {
            const inlineError = document.createElement("div");
            inlineError.className = "ocr-download-error inline";
            inlineError.textContent = state.error;
            container.appendChild(inlineError);
        }
    });
}

async function handleOcrLanguageAction(language, action) {
    const state = ocrLanguageStates[language];
    if (!state) return;

    ocrLanguageStates.__globalError = "";
    ocrLanguageStates[language] = {
        ...state,
        downloading: action === "download",
        downloaded: action === "delete" ? false : state.downloaded,
        progress: action === "download" ? Math.max(state.progress, 1) : 0,
        status: action === "download" ? "queued" : "idle",
        error: "",
    };
    renderOcrDownloadManager();

    try {
        const requestName =
            action === "download" ? "download_ocr_languages" : "delete_ocr_languages";
        await channel.request(requestName, { languages: [language] });
        const status = await channel.request("get_ocr_download_status", { languages: [language] });
        mergeOcrLanguageStates(status);
        renderOcrDownloadManager();
    } catch (error) {
        ocrLanguageStates[language] = {
            ...ocrLanguageStates[language],
            downloading: false,
            status: "error",
            error: getErrorText(error),
        };
        renderOcrDownloadManager();
    }
}

function createDefaultOcrLanguageState() {
    return {
        downloaded: false,
        downloading: false,
        progress: 0,
        status: "idle",
        error: "",
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
