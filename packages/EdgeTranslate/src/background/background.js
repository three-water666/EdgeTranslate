import { TranslatorManager, translatePage, executeGoogleScript } from "./library/translate.js";
import {
    addUrlBlacklist,
    addDomainBlacklist,
    removeUrlBlacklist,
    removeDomainBlacklist,
    updateBLackListMenu,
} from "./library/blacklist.js";
import { hotReload } from "./library/hot_reload.js";
import { promiseTabs } from "common/scripts/promise.js";
import Channel from "common/scripts/channel.js";
// map language abbreviation from browser languages to translation languages
import { BROWSER_LANGUAGES_MAP } from "common/scripts/languages.js";
import {
    DEFAULT_SETTINGS,
    getOrSetDefaultSettings,
    setDefaultSettings,
} from "common/scripts/settings.js";
import { resolveContextMenuSelection } from "./library/context_menu.js";

if (typeof BUILD_ENV !== "undefined" && BUILD_ENV === "development") {
    hotReload();
}

const RULE_GOOGLE_TTS = {
    id: 3,
    priority: 1,
    action: {
        type: "modifyHeaders",
        responseHeaders: [
            {
                header: "cross-origin-resource-policy",
                operation: "set",
                value: "cross-origin",
            },
        ],
    },
    condition: {
        urlFilter: "*://translate.google.cn/*",
        resourceTypes: ["xmlhttprequest", "media", "other"],
    },
};

/**
 * 插件安装和更新时的初始化。
 */
chrome.runtime.onInstalled.addListener(async (details) => {
    chrome.contextMenus.create({
        id: "translate",
        title: `${chrome.i18n.getMessage("Translate")} '%s'`,
        contexts: ["selection"],
    });

    chrome.contextMenus.create({
        id: "shortcut",
        title: chrome.i18n.getMessage("ShortcutSetting"),
        contexts: ["action"],
    });

    chrome.contextMenus.create({
        id: "translate_page",
        title: chrome.i18n.getMessage("TranslatePage"),
        contexts: ["page"],
    });

    chrome.contextMenus.create({
        id: "screenshot_translate",
        title: chrome.i18n.getMessage("ScreenshotTranslate"),
        contexts: ["page", "selection"],
    });

    chrome.contextMenus.create({
        id: "translate_page_google",
        title: chrome.i18n.getMessage("TranslatePageGoogle"),
        contexts: ["action"],
    });

    chrome.contextMenus.create({
        id: "add_url_blacklist",
        title: chrome.i18n.getMessage("AddUrlBlacklist"),
        contexts: ["action"],
        enabled: false,
        visible: false,
    });

    chrome.contextMenus.create({
        id: "add_domain_blacklist",
        title: chrome.i18n.getMessage("AddDomainBlacklist"),
        contexts: ["action"],
        enabled: false,
        visible: false,
    });

    chrome.contextMenus.create({
        id: "remove_url_blacklist",
        title: chrome.i18n.getMessage("RemoveUrlBlacklist"),
        contexts: ["action"],
        enabled: false,
        visible: false,
    });

    chrome.contextMenus.create({
        id: "remove_domain_blacklist",
        title: chrome.i18n.getMessage("RemoveDomainBlacklist"),
        contexts: ["action"],
        enabled: false,
        visible: false,
    });

    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const oldRuleIds = existingRules.map((rule) => rule.id);

    chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: oldRuleIds,
        addRules: [RULE_GOOGLE_TTS],
    });

    if (process.env.NODE_ENV === "production") {
        if (details.reason === "install") {
            chrome.tabs.create({
                url: "https://github.com/three-water666/EdgeTranslate",
            });
        } else if (details.reason === "update") {
            await new Promise((resolve) => {
                chrome.storage.sync.get((result) => {
                    let buffer = result;
                    setDefaultSettings(buffer, DEFAULT_SETTINGS);
                    chrome.storage.sync.set(buffer, resolve);
                });
            });

            // Fix language setting compatibility between 2.x and 1.x.x.
            chrome.storage.sync.get("languageSetting", (result) => {
                if (!result.languageSetting) return;

                if (result.languageSetting.sl === "zh-cn") {
                    result.languageSetting.sl = "zh-CN";
                } else if (result.languageSetting.sl === "zh-tw") {
                    result.languageSetting.sl = "zh-TW";
                }

                if (result.languageSetting.tl === "zh-cn") {
                    result.languageSetting.tl = "zh-CN";
                } else if (result.languageSetting.tl === "zh-tw") {
                    result.languageSetting.tl = "zh-TW";
                }
                chrome.storage.sync.set(result);
            });

            chrome.notifications.create("update_notification", {
                type: "basic",
                iconUrl: chrome.runtime.getURL("icon/icon128.png"),
                title: chrome.i18n.getMessage("AppName"),
                message: chrome.i18n.getMessage("ExtensionUpdated"),
            });
        }
    }
});

/**
 * Create communication channel.
 */
const channel = new Channel();

/**
 * Create translator manager and register event listeners and service providers.
 */
const TRANSLATOR_MANAGER = new TranslatorManager(channel);

/**
 * 监听用户点击通知事件
 */
chrome.notifications.onClicked.addListener((notificationId) => {
    switch (notificationId) {
        case "update_notification":
            chrome.tabs.create({
                url: "https://github.com/three-water666/EdgeTranslate/releases",
            });
            break;
        default:
            break;
    }
});

/**
 * 添加点击菜单后的处理事件
 */
chrome.contextMenus.onClicked.addListener((info, tab) => {
    switch (info.menuItemId) {
        case "translate":
            channel
                .requestToTab(tab.id, "get_selection")
                .then((selection) => {
                    const resolvedSelection = resolveContextMenuSelection(info, selection);
                    if (!resolvedSelection) return Promise.reject();

                    return TRANSLATOR_MANAGER.translate(
                        resolvedSelection.text,
                        resolvedSelection.position
                    );
                })
                .catch((error) => {
                    const resolvedSelection = resolveContextMenuSelection(info);
                    if (resolvedSelection) {
                        return TRANSLATOR_MANAGER.translate(
                            resolvedSelection.text,
                            resolvedSelection.position
                        );
                    }
                    return Promise.resolve(error);
                });
            break;
        case "screenshot_translate":
            handleScreenshotTranslateMenuClick();
            break;
        case "translate_page":
            translatePage(channel);
            break;
        case "translate_page_google":
            executeGoogleScript(channel);
            break;
        case "shortcut":
            chrome.tabs.create({
                url: "chrome://extensions/shortcuts",
            });
            break;
        case "add_url_blacklist":
            addUrlBlacklist();
            break;
        case "remove_url_blacklist":
            removeUrlBlacklist();
            break;
        case "add_domain_blacklist":
            addDomainBlacklist();
            break;
        case "remove_domain_blacklist":
            removeDomainBlacklist();
            break;
        default:
            break;
    }
});

async function handleScreenshotTranslateMenuClick() {
    const activeLanguages = await getActiveOcrLanguages().catch(() => []);
    if (activeLanguages.length === 0) {
        chrome.tabs.create({
            url: chrome.runtime.getURL("options/options.html#ocr-settings"),
        });
        return;
    }

    TRANSLATOR_MANAGER.screenshotTranslate().catch(() => {});
}

async function getActiveOcrLanguages() {
    const { OCRSettings: ocrSettings } = await getOrSetDefaultSettings(
        ["OCRSettings"],
        DEFAULT_SETTINGS
    );
    const selectedLanguages =
        Array.isArray(ocrSettings?.EnabledLanguages) && ocrSettings.EnabledLanguages.length > 0
            ? ocrSettings.EnabledLanguages
            : Array.isArray(ocrSettings?.Languages) && ocrSettings.Languages.length > 0
            ? ocrSettings.Languages
            : ["eng", "chi_sim"];
    await TRANSLATOR_MANAGER.createOffscreenDocument();
    const statusMap = await channel.request("get_ocr_language_status", {
        languages: selectedLanguages,
    });

    return selectedLanguages.filter((language) => statusMap?.[language]?.downloaded);
}

/**
 * 添加tab切换事件监听，用于更新黑名单信息
 */
chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
        if (tab.url && tab.url.length > 0) {
            updateBLackListMenu(tab.url);
        }
    });
});

/**
 * 添加tab刷新事件监听，用于更新黑名单信息
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tab.active && tab.url && tab.url.length > 0) {
        updateBLackListMenu(tab.url);
    }
});

/**
 * Redirect tab when redirect event happens.
 */
channel.on("redirect", (detail, sender) => chrome.tabs.update(sender.tab.id, { url: detail.url }));

/**
 * Open options page when open_options_page button clicked.
 */
channel.on("open_options_page", () => chrome.runtime.openOptionsPage());

channel.on("open_ocr_settings_page", () => {
    chrome.tabs.create({
        url: chrome.runtime.getURL("options/options.html#ocr-settings"),
    });
});

/**
 * Forward page translate event back to pages.
 */
channel.on("page_translate_event", (detail, sender) => {
    channel.emitToTabs(sender.tab.id, "page_translate_event", detail);
});

/**
 * Forward page translate availability event back to the current page.
 */
channel.on("page_translate_unavailable", (detail, sender) => {
    if (sender.tab?.id) {
        channel.emitToTabs(sender.tab.id, "page_translate_unavailable", detail);
    }
});

/**
 * Provide UI language detecting service.
 */
channel.provide("get_lang", () => {
    return Promise.resolve({
        lang: BROWSER_LANGUAGES_MAP[chrome.i18n.getUILanguage()],
    });
});

/**
 *  将快捷键消息转发给content_scripts
 */
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
