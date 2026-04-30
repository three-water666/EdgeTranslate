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

export async function resetDynamicRules() {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const oldRuleIds = existingRules.map((rule) => rule.id);

    chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: oldRuleIds,
        addRules: [RULE_GOOGLE_TTS],
    });
}
