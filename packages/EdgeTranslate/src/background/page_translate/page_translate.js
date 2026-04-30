import { log } from "common/scripts/common.js";
import { promiseTabs } from "common/scripts/promise.js";
import { DEFAULT_SETTINGS, getOrSetDefaultSettings } from "common/scripts/settings.js";

/**
 * 使用用户选定的网页翻译引擎翻译当前网页。
 *
 * @param {import("../../common/scripts/channel.js").default} channel Communication channel.
 */
function translatePage(channel) {
    getOrSetDefaultSettings(["DefaultPageTranslator"], DEFAULT_SETTINGS).then((result) => {
        let translator = result.DefaultPageTranslator;
        switch (translator) {
            case "GooglePageTranslate":
                executeGoogleScript(channel);
                break;
            default:
                executeGoogleScript(channel);
                break;
        }
    });
}

/**
 * 执行谷歌网页翻译相关脚本。
 *
 * @param {import("../../common/scripts/channel.js").default} channel Communication channel.
 */
async function executeGoogleScript(channel) {
    let tabs;
    try {
        tabs = await promiseTabs.query({ active: true, currentWindow: true });
        if (!tabs || tabs.length === 0) {
            log("No active tab found to execute script.");
            return;
        }
        const tabId = tabs[0].id;
        await chrome.scripting.executeScript({
            target: { tabId },
            files: ["/google/init.js"],
        });
        channel.emitToTabs(tabId, "start_page_translate", { translator: "google" });
    } catch (e) {
        if (tabs && tabs.length > 0) {
            log(`Failed to execute script on tab ${tabs[0].id} (${tabs[0].url}): ${e.message}`);
        } else if (e instanceof Error) {
            log(`Chrome runtime error: ${e.message}`);
        } else {
            log(`Chrome runtime error: ${String(e)}`);
        }
    }
}

export { translatePage, executeGoogleScript };
