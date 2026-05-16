import { DEFAULT_SETTINGS, getOrSetDefaultSettings } from "common/scripts/settings.js";

const PDF_FILE_ACCESS_NOTIFICATION_ID = "pdf_file_access_notification";
const PDF_FILE_ACCESS_NOTIFICATION_THROTTLE = 30 * 60 * 1000;
let lastPDFFileAccessNotificationAt = 0;

function registerPDFFileAccessReminders() {
    chrome.notifications.onClicked.addListener(handlePDFFileAccessNotificationClick);
    chrome.tabs.onActivated.addListener((activeInfo) => {
        chrome.tabs.get(activeInfo.tabId, maybeShowPDFFileAccessNotification);
    });
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (tab.active && tab.url) {
            maybeShowPDFFileAccessNotification(tab);
        }
    });
}

async function maybeShowPDFFileAccessNotification(tab) {
    if (!isLocalPDFUrl(tab?.url)) return;

    const [{ OtherSettings }, allowed] = await Promise.all([
        getOrSetDefaultSettings("OtherSettings", DEFAULT_SETTINGS),
        isFileSchemeAccessAllowed(),
    ]);
    if (!OtherSettings?.UsePDFjs || allowed) return;

    const now = Date.now();
    if (now - lastPDFFileAccessNotificationAt < PDF_FILE_ACCESS_NOTIFICATION_THROTTLE) {
        return;
    }
    lastPDFFileAccessNotificationAt = now;

    chrome.notifications.create(PDF_FILE_ACCESS_NOTIFICATION_ID, {
        type: "basic",
        iconUrl: chrome.runtime.getURL("icon/icon128.png"),
        title: chrome.i18n.getMessage("PDFFileAccessNotificationTitle"),
        message: chrome.i18n.getMessage("PDFFileAccessNotificationMessage"),
    });
}

function handlePDFFileAccessNotificationClick(notificationId) {
    if (notificationId !== PDF_FILE_ACCESS_NOTIFICATION_ID) {
        return;
    }

    openExtensionSettingsPage();
    chrome.notifications.clear(PDF_FILE_ACCESS_NOTIFICATION_ID);
}

function isLocalPDFUrl(url) {
    return typeof url === "string" && /^file:\/\//i.test(url) && /\.pdf(?:[?#].*)?$/i.test(url);
}

function isFileSchemeAccessAllowed() {
    return new Promise((resolve) => {
        if (!chrome.extension?.isAllowedFileSchemeAccess) {
            resolve(true);
            return;
        }

        chrome.extension.isAllowedFileSchemeAccess(resolve);
    });
}

function openExtensionSettingsPage() {
    chrome.tabs.create({
        url: `chrome://extensions/?id=${chrome.runtime.id}`,
    });
}

registerPDFFileAccessReminders();
