import {
    addUrlBlacklist,
    addDomainBlacklist,
    removeUrlBlacklist,
    removeDomainBlacklist,
} from "../blacklist/blacklist.js";
import { executeGoogleScript, translatePage } from "../page_translate/page_translate.js";
import { resolveContextMenuSelection } from "./selection.js";
import { submitTranslationRequest } from "../translation/translation_request.js";
import { DEFAULT_SETTINGS, getOrSetDefaultSettings } from "common/scripts/settings.js";

const CONTEXT_MENU_CONFIGS = [
    {
        id: "translate",
        title: `${chrome.i18n.getMessage("Translate")} '%s'`,
        contexts: ["selection"],
    },
    {
        id: "shortcut",
        title: chrome.i18n.getMessage("ShortcutSetting"),
        contexts: ["action"],
    },
    {
        id: "translate_page",
        title: chrome.i18n.getMessage("TranslatePage"),
        contexts: ["page"],
    },
    {
        id: "screenshot_translate",
        title: chrome.i18n.getMessage("ScreenshotTranslate"),
        contexts: ["page", "selection"],
    },
    {
        id: "translate_page_google",
        title: chrome.i18n.getMessage("TranslatePageGoogle"),
        contexts: ["action"],
    },
    {
        id: "add_url_blacklist",
        title: chrome.i18n.getMessage("AddUrlBlacklist"),
        contexts: ["action"],
        enabled: false,
        visible: false,
    },
    {
        id: "add_domain_blacklist",
        title: chrome.i18n.getMessage("AddDomainBlacklist"),
        contexts: ["action"],
        enabled: false,
        visible: false,
    },
    {
        id: "remove_url_blacklist",
        title: chrome.i18n.getMessage("RemoveUrlBlacklist"),
        contexts: ["action"],
        enabled: false,
        visible: false,
    },
    {
        id: "remove_domain_blacklist",
        title: chrome.i18n.getMessage("RemoveDomainBlacklist"),
        contexts: ["action"],
        enabled: false,
        visible: false,
    },
];

function createContextMenus() {
    CONTEXT_MENU_CONFIGS.forEach((menu) => chrome.contextMenus.create(menu));
}

export function registerContextMenus({
    channel,
    textTranslation,
    screenshotTranslation,
    ocrClient,
}) {
    chrome.runtime.onInstalled.addListener(() => {
        createContextMenus();
    });

    chrome.contextMenus.onClicked.addListener((info, tab) => {
        handleContextMenuClick({
            channel,
            info,
            tab,
            textTranslation,
            screenshotTranslation,
            ocrClient,
        });
    });
}

function handleContextMenuClick({
    channel,
    info,
    tab,
    textTranslation,
    screenshotTranslation,
    ocrClient,
}) {
    switch (info.menuItemId) {
        case "translate":
            handleSelectionTranslateMenuClick({ channel, info, tab, textTranslation });
            break;
        case "screenshot_translate":
            handleScreenshotTranslateMenuClick({ screenshotTranslation, ocrClient });
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
}

function handleSelectionTranslateMenuClick({ channel, info, tab, textTranslation }) {
    channel
        .requestToTab(tab.id, "get_selection")
        .then((selection) => {
            const resolvedSelection = resolveContextMenuSelection(info, selection);
            if (!resolvedSelection) return Promise.reject();

            return submitTranslationRequest(textTranslation, {
                text: resolvedSelection.text,
                position: resolvedSelection.position,
            });
        })
        .catch((error) => {
            const resolvedSelection = resolveContextMenuSelection(info);
            if (resolvedSelection) {
                return submitTranslationRequest(textTranslation, {
                    text: resolvedSelection.text,
                    position: resolvedSelection.position,
                });
            }
            return Promise.resolve(error);
        });
}

async function handleScreenshotTranslateMenuClick({ screenshotTranslation, ocrClient }) {
    const activeLanguages = await getActiveOcrLanguages(ocrClient).catch(() => []);
    if (activeLanguages.length === 0) {
        chrome.tabs.create({
            url: chrome.runtime.getURL("options/options.html#ocr-settings"),
        });
        return;
    }

    screenshotTranslation.run().catch(() => {});
}

async function getActiveOcrLanguages(ocrClient) {
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
    const statusMap = await ocrClient.getLanguageStatus(selectedLanguages);

    return selectedLanguages.filter((language) => statusMap?.[language]?.downloaded);
}
