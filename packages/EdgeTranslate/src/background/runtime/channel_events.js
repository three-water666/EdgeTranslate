import { BROWSER_LANGUAGES_MAP } from "common/scripts/languages.js";

export function registerChannelEvents(channel) {
    channel.on("redirect", (detail, sender) =>
        chrome.tabs.update(sender.tab.id, { url: detail.url })
    );

    channel.on("open_options_page", () => chrome.runtime.openOptionsPage());

    channel.on("open_ocr_settings_page", () => {
        chrome.tabs.create({
            url: chrome.runtime.getURL("options/options.html#ocr-settings"),
        });
    });

    channel.on("page_translate_event", (detail, sender) => {
        channel.emitToTabs(sender.tab.id, "page_translate_event", detail);
    });

    channel.on("page_translate_unavailable", (detail, sender) => {
        if (sender.tab?.id) {
            channel.emitToTabs(sender.tab.id, "page_translate_unavailable", detail);
        }
    });

    channel.provide("get_lang", () =>
        Promise.resolve({
            lang: BROWSER_LANGUAGES_MAP[chrome.i18n.getUILanguage()],
        })
    );
}
