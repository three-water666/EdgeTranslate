import { getDomain, log } from "common/scripts/common.js";
import { DEFAULT_SETTINGS, getOrSetDefaultSettings } from "common/scripts/settings.js";

export {
    addUrlBlacklist,
    addDomainBlacklist,
    removeUrlBlacklist,
    removeDomainBlacklist,
    updateBLackListMenu,
};

const DISABLED_MARK = "X";

/**
 * 将当前页面的url添加到黑名单
 */
async function addUrlBlacklist() {
    await addBlacklist("urls", async () => {
        await disableItems([
            "add_url_blacklist",
            "add_domain_blacklist",
            "remove_domain_blacklist",
        ]);
        await enableItems(["remove_url_blacklist"]);
    });

    // change the badge text when add url to blacklist
    await chrome.action.setBadgeText({ text: DISABLED_MARK });
}

/**
 * 将当前页面的url移出黑名单
 */
async function removeUrlBlacklist() {
    await removeBlacklist("urls", async () => {
        await disableItems(["remove_url_blacklist", "remove_domain_blacklist"]);
        await enableItems(["add_url_blacklist", "add_domain_blacklist"]);
    });

    // clear the badge text when remove url from blacklist
    await chrome.action.setBadgeText({ text: "" });
}

/**
 * 将当前页面的域名添加到黑名单
 */
async function addDomainBlacklist() {
    await addBlacklist("domains", async () => {
        await disableItems(["add_url_blacklist", "add_domain_blacklist", "remove_url_blacklist"]);
        await enableItems(["remove_domain_blacklist"]);
    });

    // change the badge text when add domain to blacklist
    await chrome.action.setBadgeText({ text: DISABLED_MARK });
}

/**
 * 将当前页面的域名移出黑名单
 */
async function removeDomainBlacklist() {
    await removeBlacklist("domains", async (blacklist, url) => {
        // 如果该url还在url黑名单中
        if (blacklist.urls[url]) {
            await disableItems([
                "add_url_blacklist",
                "add_domain_blacklist",
                "remove_domain_blacklist",
            ]);
            await enableItems(["remove_url_blacklist"]);
        } else {
            await disableItems(["remove_url_blacklist", "remove_domain_blacklist"]);
            await enableItems(["add_url_blacklist", "add_domain_blacklist"]);

            // clear the badge text when remove domain from blacklist
            await chrome.action.setBadgeText({ text: "" });
        }
    });
}

/**
 * 执行添加黑名单的相关操作
 *
 * @param {String} field 决定将url拉黑还是将域名拉黑
 * @param {Function} callback 回调
 */
async function addBlacklist(field, callback) {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs[0]) {
        const result = await getOrSetDefaultSettings("blacklist", DEFAULT_SETTINGS);
        let blacklist = result.blacklist;
        let value = field === "urls" ? tabs[0].url : getDomain(tabs[0].url);
        blacklist[field][value] = true;

        await chrome.storage.sync.set({ blacklist });
        await callback(blacklist, tabs[0].url);
    }
}

/**
 * 执行移出黑名单相关操作
 *
 * @param {String} field 决定从域名黑名单中移出还是从url黑名单中移出
 * @param {Function} callback 回调
 */
async function removeBlacklist(field, callback) {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs[0]) {
        const result = await getOrSetDefaultSettings("blacklist", DEFAULT_SETTINGS);
        let blacklist = result.blacklist;
        let value = field === "urls" ? tabs[0].url : getDomain(tabs[0].url);
        if (blacklist[field][value]) {
            delete blacklist[field][value];
        }

        await chrome.storage.sync.set({ blacklist });
        await callback(blacklist, tabs[0].url);
    }
}

/**
 * 当用户切换到一个页面时，根据该页面是否已经在黑名单中展示不同的context menu项
 *
 * @param {String} url 切换到的页面的url
 */
async function updateBLackListMenu(url) {
    const result = await getOrSetDefaultSettings("blacklist", DEFAULT_SETTINGS);

    if (result.blacklist.domains[getDomain(url)]) {
        await disableItems(["add_url_blacklist", "remove_url_blacklist", "add_domain_blacklist"]);
        await enableItems(["remove_domain_blacklist"]);

        // the domain is in the blacklist and update the badge text
        await chrome.action.setBadgeText({ text: DISABLED_MARK });
    } else if (result.blacklist.urls[url]) {
        await disableItems([
            "add_url_blacklist",
            "add_domain_blacklist",
            "remove_domain_blacklist",
        ]);
        await enableItems(["remove_url_blacklist"]);

        // the url is in the blacklist and update the badge text
        await chrome.action.setBadgeText({ text: DISABLED_MARK });
    } else {
        await disableItems(["remove_url_blacklist", "remove_domain_blacklist"]);
        await enableItems(["add_url_blacklist", "add_domain_blacklist"]);

        // the url and domain is not in the blacklist and clear the badge text
        await chrome.action.setBadgeText({ text: "" });
    }
}

/**
 * 启用指定的context menu项
 *
 * @param {String} items
 */
async function enableItems(items) {
    const promises = items.map(async (item) => {
        try {
            await chrome.contextMenus.update(item, {
                enabled: true,
                visible: true,
            });
        } catch (error) {
            log(`Chrome runtime error: ${error}`);
        }
    });
    await Promise.all(promises);
}

/**
 * 禁用指定的context menu项
 *
 * @param {String} items
 */
async function disableItems(items) {
    const promises = items.map(async (item) => {
        try {
            await chrome.contextMenus.update(item, {
                enabled: false,
                visible: false,
            });
        } catch (error) {
            log(`Chrome runtime error: ${error}`);
        }
    });
    await Promise.all(promises);
}
