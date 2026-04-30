import { registerOcrChannelServices } from "../ocr/channel_services.js";
import { createOffscreenOcrClient } from "../ocr/offscreen_ocr_client.js";
import { createScreenshotTranslationService } from "../ocr/screenshot_translate.js";
import { registerTranslationChannelServices } from "./api/channel_services.js";
import { registerTranslationEvents } from "./api/events.js";
import { createOffscreenTranslatorClient } from "./clients/offscreen_translator_client.js";
import { createTranslationTabPresenter } from "./presentation/tab_presenter.js";
import { createPronunciationService } from "./services/pronunciation.js";
import { createTextTranslationService } from "./services/text_translation.js";
import { createTranslatorConfigService } from "./services/translator_config.js";
import { createTranslationState } from "./state/translation_state.js";
import { getCurrentTranslationTabId } from "./target/target_tab.js";

export function createTranslationModule(channel) {
    // 显式组装翻译依赖图：state 管设置状态，client 隐藏 offscreen 通信细节，
    // 具体 service 只保留各自功能流程，避免重新变成一个万能 manager。
    const translationState = createTranslationState();
    const translatorClient = createOffscreenTranslatorClient(channel);
    const ocrClient = createOffscreenOcrClient(channel);
    const tabPresenter = createTranslationTabPresenter(channel);
    const getCurrentTabId = () => getCurrentTranslationTabId(channel);
    const textTranslation = createTextTranslationService({
        state: translationState,
        translatorClient,
        tabPresenter,
        getCurrentTabId,
    });
    const pronunciation = createPronunciationService({
        state: translationState,
        translatorClient,
        tabPresenter,
        getCurrentTabId,
    });
    const translatorConfig = createTranslatorConfigService({
        state: translationState,
        translatorClient,
        channel,
        tabPresenter,
    });
    const screenshotTranslation = createScreenshotTranslationService({
        channel,
        ocrClient,
        textTranslation,
        tabPresenter,
    });

    return {
        contextMenuServices: {
            textTranslation,
            screenshotTranslation,
            ocrClient,
        },
        translationState,
        translatorClient,
        ocrClient,
        textTranslation,
        pronunciation,
        translatorConfig,
        screenshotTranslation,
    };
}

export function registerTranslationModule(channel, translationModule) {
    registerTranslationChannelServices({
        channel,
        textTranslation: translationModule.textTranslation,
        pronunciation: translationModule.pronunciation,
        translatorConfig: translationModule.translatorConfig,
        screenshotTranslation: translationModule.screenshotTranslation,
    });
    registerOcrChannelServices({ channel, ocrClient: translationModule.ocrClient });
    registerTranslationEvents({
        channel,
        translationState: translationModule.translationState,
        translatorClient: translationModule.translatorClient,
        translatorConfig: translationModule.translatorConfig,
        pronunciation: translationModule.pronunciation,
    });
}
