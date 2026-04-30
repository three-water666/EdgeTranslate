import { delayPromise, promiseTabs } from "common/scripts/promise.js";
import { submitTranslationRequest } from "../translation/translation_request.js";

export function createScreenshotTranslationService({
    channel,
    ocrClient,
    textTranslation,
    tabPresenter,
}) {
    async function run() {
        const currentTab = await getCurrentTab();
        if (!currentTab?.id) return;

        await closeResultFrame(tabPresenter, currentTab.id);
        const selection = await requestScreenshotSelection(channel, currentTab.id);
        if (!selection?.rect) return;

        const timestamp = new Date().getTime();
        emitScreenshotTranslateStart(tabPresenter, currentTab.id, selection.position, timestamp);

        const cleanedText = await recognizeScreenshotText({
            ocrClient,
            tabPresenter,
            currentTab,
            selection,
            timestamp,
        });
        if (!cleanedText) return;

        return submitTranslationRequest(textTranslation, {
            tabId: currentTab.id,
            text: cleanedText,
            position: selection.position,
            options: {
                timestamp,
                skipStartEvent: true,
                translateMode: "screenshot",
            },
        });
    }

    return {
        run,
    };
}

async function getCurrentTab() {
    const tabs = await promiseTabs.query({ active: true, currentWindow: true });
    return tabs[0];
}

async function closeResultFrame(tabPresenter, tabId) {
    tabPresenter.sendCommand(tabId, "close_result_frame");
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

function emitScreenshotTranslateStart(tabPresenter, tabId, position, timestamp) {
    tabPresenter.startTranslating(tabId, {
        text: "",
        position,
        timestamp,
        loadingMessage: getScreenshotLoadingMessage(),
        translateMode: "screenshot",
    });
}

async function recognizeScreenshotText({
    ocrClient,
    tabPresenter,
    currentTab,
    selection,
    timestamp,
}) {
    const screenshotUrl = await captureVisibleTab(currentTab.windowId);

    try {
        const text = await ocrClient.recognizeImage({
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
            tabPresenter,
            currentTab.id,
            timestamp,
            chrome.i18n.getMessage("ScreenshotTranslateNoText")
        );
        return "";
    } catch (error) {
        emitOcrRequestError(tabPresenter, currentTab.id, timestamp, error);
        throw error;
    }
}

function emitOcrRequestError(tabPresenter, tabId, timestamp, error) {
    const message = String(error).includes("OCR_LANG_DATA_MISSING")
        ? getOcrDataMissingMessage()
        : chrome.i18n.getMessage("ScreenshotTranslateFailed");

    emitScreenshotError(tabPresenter, tabId, timestamp, message);
}

function emitScreenshotError(tabPresenter, tabId, timestamp, errorMsg) {
    notifyScreenshotTranslate(errorMsg);
    tabPresenter.translatingError(tabId, {
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
