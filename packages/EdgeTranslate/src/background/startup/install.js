import { DEFAULT_SETTINGS, setDefaultSettings } from "common/scripts/settings.js";
import { resetDynamicRules } from "./dynamic_rules.js";

export function registerInstallHandlers() {
    chrome.runtime.onInstalled.addListener(async (details) => {
        await resetDynamicRules();
        await handleProductionInstallOrUpdate(details);
    });
}

async function handleProductionInstallOrUpdate(details) {
    if (process.env.NODE_ENV !== "production") {
        return;
    }

    if (details.reason === "install") {
        openProjectPage();
        return;
    }

    if (details.reason === "update") {
        await syncDefaultSettings();
        fixLegacyLanguageSettings();
        showUpdateNotification();
    }
}

function openProjectPage() {
    chrome.tabs.create({
        url: "https://github.com/three-water666/EdgeTranslate",
    });
}

function syncDefaultSettings() {
    return new Promise((resolve) => {
        chrome.storage.sync.get((result) => {
            let buffer = result;
            setDefaultSettings(buffer, DEFAULT_SETTINGS);
            chrome.storage.sync.set(buffer, resolve);
        });
    });
}

function fixLegacyLanguageSettings() {
    // Fix language setting compatibility between 2.x and 1.x.x.
    chrome.storage.sync.get("languageSetting", (result) => {
        if (!result.languageSetting) return;

        normalizeLanguageSetting(result.languageSetting, "sl");
        normalizeLanguageSetting(result.languageSetting, "tl");
        chrome.storage.sync.set(result);
    });
}

function normalizeLanguageSetting(languageSetting, key) {
    if (languageSetting[key] === "zh-cn") {
        languageSetting[key] = "zh-CN";
    } else if (languageSetting[key] === "zh-tw") {
        languageSetting[key] = "zh-TW";
    }
}

function showUpdateNotification() {
    chrome.notifications.create("update_notification", {
        type: "basic",
        iconUrl: chrome.runtime.getURL("icon/icon128.png"),
        title: chrome.i18n.getMessage("AppName"),
        message: chrome.i18n.getMessage("ExtensionUpdated"),
    });
}
