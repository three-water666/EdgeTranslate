import { delayPromise, promiseTabs } from "common/scripts/promise.js";

async function runScreenshotTranslate(manager) {
    await manager.config_loader;
    await manager.createOffscreenDocument();

    const currentTab = await getCurrentTab();
    if (!currentTab?.id) return;

    await closeResultFrame(manager.channel, currentTab.id);
    const selection = await requestScreenshotSelection(manager.channel, currentTab.id);
    if (!selection?.rect) return;

    const timestamp = new Date().getTime();
    emitScreenshotTranslateStart(manager.channel, currentTab.id, selection.position, timestamp);

    const cleanedText = await recognizeScreenshotText(manager, currentTab, selection, timestamp);
    if (!cleanedText) return;

    return manager.translateOnTabWithOptions(currentTab.id, cleanedText, selection.position, {
        timestamp,
        skipStartEvent: true,
        translateMode: "screenshot",
    });
}

async function getCurrentTab() {
    const tabs = await promiseTabs.query({ active: true, currentWindow: true });
    return tabs[0];
}

async function closeResultFrame(channel, tabId) {
    channel.emitToTabs(tabId, "command", {
        command: "close_result_frame",
    });
    await delayPromise(80);
}

async function requestScreenshotSelection(channel, tabId) {
    try {
        return await channel.requestToTab(tabId, "select_capture_area");
    } catch (error) {
        notifyScreenshotTranslate(chrome.i18n.getMessage("ScreenshotTranslateUnsupported"));
        throw error;
    }
}

function emitScreenshotTranslateStart(channel, tabId, position, timestamp) {
    channel.emitToTabs(tabId, "start_translating", {
        text: "",
        position,
        timestamp,
        loadingMessage: getScreenshotLoadingMessage(),
        translateMode: "screenshot",
    });
}

async function recognizeScreenshotText(manager, currentTab, selection, timestamp) {
    const screenshotUrl = await captureVisibleTab(currentTab.windowId);

    try {
        const text = await manager.channel.request("ocr_image", {
            screenshotUrl,
            rect: selection.rect,
            viewportWidth: selection.viewportWidth,
            viewportHeight: selection.viewportHeight,
        });
        const cleanedText = typeof text === "string" ? text.trim() : "";

        if (cleanedText) {
            return cleanedText;
        }

        emitScreenshotError(
            manager.channel,
            currentTab.id,
            timestamp,
            chrome.i18n.getMessage("ScreenshotTranslateNoText")
        );
        return "";
    } catch (error) {
        emitOcrRequestError(manager.channel, currentTab.id, timestamp, error);
        throw error;
    }
}

function emitOcrRequestError(channel, tabId, timestamp, error) {
    const message = String(error).includes("OCR_LANG_DATA_MISSING")
        ? getOcrDataMissingMessage()
        : chrome.i18n.getMessage("ScreenshotTranslateFailed");

    emitScreenshotError(channel, tabId, timestamp, message);
}

function emitScreenshotError(channel, tabId, timestamp, errorMsg) {
    notifyScreenshotTranslate(errorMsg);
    channel.emitToTabs(tabId, "translating_error", {
        timestamp,
        translateMode: "screenshot",
        error: {
            errorType: "API_ERR",
            errorCode: "OCR_ERR",
            errorMsg,
        },
    });
}

function captureVisibleTab(windowId) {
    return new Promise((resolve, reject) => {
        chrome.tabs.captureVisibleTab(windowId, { format: "png" }, (dataUrl) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
                return;
            }
            resolve(dataUrl);
        });
    });
}

function notifyScreenshotTranslate(message) {
    if (!message) return;

    chrome.notifications.create({
        type: "basic",
        iconUrl: chrome.runtime.getURL("icon/icon128.png"),
        title: chrome.i18n.getMessage("AppName"),
        message,
    });
}

function getOcrDataMissingMessage() {
    const message = chrome.i18n.getMessage("ScreenshotTranslateOcrDataMissing");
    if (message) return message;

    const language = chrome.i18n.getUILanguage().toLowerCase();
    if (language.startsWith("zh")) {
        return "OCR 语言包未下载，请先到设置页手动下载后再使用截图翻译。";
    }

    return "OCR language data is not downloaded. Open settings and download it first.";
}

function getScreenshotLoadingMessage() {
    const message = chrome.i18n.getMessage("ScreenshotTranslateLoading");
    if (message) return message;

    const language = chrome.i18n.getUILanguage().toLowerCase();
    if (language.startsWith("zh")) {
        return "正在识别截图中的文字并翻译...";
    }

    return "Recognizing text from screenshot...";
}

export { runScreenshotTranslate };
