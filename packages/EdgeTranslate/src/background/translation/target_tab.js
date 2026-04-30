import { promiseTabs, delayPromise } from "common/scripts/promise.js";

export async function getCurrentTranslationTabId(channel) {
    let tabId = -1;
    const tabs = await promiseTabs.query({ active: true, currentWindow: true });
    tabId = tabs[0].id;

    await channel.requestToTab(tabId, "check_availability").catch(async () => {
        const shouldOpenNoticePage = await canShowNoticePage(tabs[0]);
        if (!shouldOpenNoticePage) {
            tabId = -1;
            return;
        }

        tabId = await getOrCreateNoticeTabId();
    });

    return tabId;
}

function canShowNoticePage(tab) {
    return new Promise((resolve) => {
        if (/^file:\/\.*/.test(tab.url)) {
            chrome.extension.isAllowedFileSchemeAccess((allowed) => {
                if (!allowed && confirm(chrome.i18n.getMessage("PermissionRemind"))) {
                    chrome.tabs.create({
                        url: `chrome://extensions/?id=${chrome.runtime.id}`,
                    });
                    resolve(false);
                } else {
                    resolve(true);
                }
            });
            return;
        }

        resolve(true);
    });
}

async function getOrCreateNoticeTabId() {
    const noticePageUrl = chrome.runtime.getURL("content/notice/notice.html");

    try {
        const tab = (await promiseTabs.query({ url: noticePageUrl }))[0];
        chrome.tabs.highlight({
            tabs: tab.index,
        });
        return tab.id;
    } catch (error) {
        const tab = await promiseTabs.create({
            url: noticePageUrl,
            active: true,
        });
        await delayPromise(200);
        return tab.id;
    }
}
