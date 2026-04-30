import Channel from "common/scripts/channel.js";
import { registerKeyboardCommandHandlers } from "./commands/keyboard_commands.js";
import { hotReload } from "./dev/hot_reload.js";
import { registerBlacklistTabHandlers } from "./menus/blacklist_tab_events.js";
import { registerContextMenus } from "./menus/context_menus.js";
import { registerOcrChannelServices } from "./ocr/channel_services.js";
import { createOffscreenOcrClient } from "./ocr/offscreen_ocr_client.js";
import { createScreenshotTranslationService } from "./ocr/screenshot_translate.js";
import { registerChannelEvents } from "./runtime/channel_events.js";
import { registerNotificationHandlers } from "./runtime/notifications.js";
import { registerInstallHandlers } from "./startup/install.js";
import { registerTranslationChannelServices } from "./translation/channel_services.js";
import { registerTranslationEvents } from "./translation/events.js";
import { createOffscreenTranslatorClient } from "./translation/offscreen_translator_client.js";
import { createPronunciationService } from "./translation/pronunciation.js";
import { createTranslationState } from "./translation/state.js";
import { getCurrentTranslationTabId } from "./translation/target_tab.js";
import { createTranslationTabPresenter } from "./translation/tab_presenter.js";
import { createTextTranslationService } from "./translation/text_translation.js";
import { createTranslatorConfigService } from "./translation/translator_config.js";

if (typeof BUILD_ENV !== "undefined" && BUILD_ENV === "development") {
    hotReload();
}

const channel = new Channel();
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

registerInstallHandlers();
registerNotificationHandlers();
registerContextMenus({ channel, textTranslation, screenshotTranslation, ocrClient });
registerBlacklistTabHandlers();
registerChannelEvents(channel);
registerTranslationChannelServices({
    channel,
    textTranslation,
    pronunciation,
    translatorConfig,
    screenshotTranslation,
});
registerOcrChannelServices({ channel, ocrClient });
registerTranslationEvents({
    channel,
    translationState,
    translatorClient,
    translatorConfig,
    pronunciation,
});
registerKeyboardCommandHandlers(channel);
