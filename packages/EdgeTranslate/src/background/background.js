import { TranslatorManager, translatePage, executeGoogleScript } from "./library/translate.js";
import {
    addUrlBlacklist,
    addDomainBlacklist,
    removeUrlBlacklist,
    removeDomainBlacklist,
    updateBLackListMenu,
} from "./library/blacklist.js";
import { promiseTabs } from "common/scripts/promise.js";
import Channel from "common/scripts/channel.js";
// map language abbreviation from browser languages to translation languages
import { BROWSER_LANGUAGES_MAP } from "common/scripts/languages.js";
import { DEFAULT_SETTINGS, setDefaultSettings } from "common/scripts/settings.js";

const RULE_CSP_ALL = {
    id: 1,
    priority: 1,
    action: {
        type: "modifyHeaders",
        responseHeaders: [{ header: "content-security-policy", operation: "remove" }],
    },
    condition: {
        resourceTypes: ["main_frame", "sub_frame"],
    },
};

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

    // Add an entry to options page for Firefox as it doesn't have one.
    if (BROWSER_ENV === "firefox") {
        chrome.contextMenus.create({
            id: "settings",
            title: chrome.i18n.getMessage("Settings"),
            contexts: ["action"],
        });
    }

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
        addRules: [RULE_CSP_ALL, RULE_GOOGLE_TTS],
    });
    // 只有在生产环境下，才会展示说明页面
    if (process.env.NODE_ENV === "production") {
        if (details.reason === "install") {
            // 首次安装，引导用户查看wiki
            chrome.tabs.create({
                // 为wiki页面创建一个新的标签页
                url: chrome.i18n.getMessage("WikiLink"),
            });

            // 告知用户数据收集相关信息
            chrome.notifications.create("data_collection_notification", {
                type: "basic",
                iconUrl: chrome.runtime.getURL("icon/icon128.png"),
                title: chrome.i18n.getMessage("AppName"),
                message: chrome.i18n.getMessage("DataCollectionNotice"),
            });
        } else if (details.reason === "update") {
            await new Promise((resolve) => {
                chrome.storage.sync.get((result) => {
                    let buffer = result; // use var buffer as a pointer
                    setDefaultSettings(buffer, DEFAULT_SETTINGS); // assign default value to buffer
                    chrome.storage.sync.set(buffer, resolve);
                });
            });

            // Fix language setting compatibility between Edge Translate 2.x and 1.x.x.
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

            // 从旧版本更新，引导用户查看更新日志
            chrome.notifications.create("update_notification", {
                type: "basic",
                iconUrl: chrome.runtime.getURL("icon/icon128.png"),
                title: chrome.i18n.getMessage("AppName"),
                message: chrome.i18n.getMessage("ExtensionUpdated"),
            });
        }

        // 卸载原因调查
        chrome.runtime.setUninstallURL("https://wj.qq.com/s2/3265930/8f07/");
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
                // 为releases页面创建一个新的标签页
                url: "https://github.com/EdgeTranslate/EdgeTranslate/releases",
            });
            break;
        case "data_collection_notification":
            chrome.tabs.create({
                // 为设置页面单独创建一个标签页
                url: chrome.runtime.getURL("options/options.html#google-analytics"),
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
            break;
        case "translate_page":
            translatePage(channel);
            break;
        case "translate_page_google":
            executeGoogleScript(channel);
            break;
        case "settings":
            chrome.runtime.openOptionsPage();
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

/**
 * Forward page translate event back to pages.
 */
channel.on("page_translate_event", (detail, sender) => {
    channel.emitToTabs(sender.tab.id, "page_translate_event", detail);
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
