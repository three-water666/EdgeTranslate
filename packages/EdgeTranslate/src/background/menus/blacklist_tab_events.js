import { updateBLackListMenu } from "../blacklist/blacklist.js";

export function registerBlacklistTabHandlers() {
    chrome.tabs.onActivated.addListener((activeInfo) => {
        chrome.tabs.get(activeInfo.tabId, (tab) => {
            if (tab.url && tab.url.length > 0) {
                updateBLackListMenu(tab.url);
            }
        });
    });

    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (tab.active && tab.url && tab.url.length > 0) {
            updateBLackListMenu(tab.url);
        }
    });
}
