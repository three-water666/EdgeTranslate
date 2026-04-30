import { promiseTabs } from "common/scripts/promise.js";
import { translatePage } from "../page_translate/page_translate.js";

export function registerKeyboardCommandHandlers(channel) {
    chrome.commands.onCommand.addListener((command) => {
        switch (command) {
            case "translate_page":
                translatePage(channel);
                break;
            default:
                promiseTabs
                    .query({ active: true, currentWindow: true })
                    .then((tabs) => channel.emitToTabs(tabs[0].id, "command", { command }))
                    .catch(() => {});
                break;
        }
    });
}
