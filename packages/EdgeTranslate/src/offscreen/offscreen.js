import Channel from "common/scripts/channel.js";
import {
    TranslatorManager,
    translatePage,
    executeGoogleScript,
} from "../background/library/translate.js";

const channel = new Channel();
const TRANSLATOR_MANAGER = new TranslatorManager(channel);

channel.on("translate_by_offscreen", (detail) => {
    const { tab, info } = detail;
    channel
        .requestToTab(tab.id, "get_selection")
        .then(({ text, position }) => {
            if (text) {
                return TRANSLATOR_MANAGER.translate(text, position);
            }
            return Promise.reject();
        })
        .catch((error) => {
            // If content scripts can not access the tab the selection, use info.selectionText instead.
            if (info.selectionText.trim()) {
                return TRANSLATOR_MANAGER.translate(info.selectionText, null);
            }
            return Promise.resolve(error);
        });
});

channel.on("translate_page_by_offscreen", (detail) => {
    const { channel } = detail;
    translatePage(channel);
});

channel.on("translate_page_google_by_offscreen", (detail) => {
    const { channel } = detail;
    executeGoogleScript(channel);
});
