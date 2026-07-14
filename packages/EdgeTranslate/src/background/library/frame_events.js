import {
    SUBFRAME_POINTER_DOWN_EVENT,
    TOP_FRAME_POINTER_DOWN_EVENT,
} from "common/scripts/frame_events.js";

export function registerSubframePointerDownForwarder(channel) {
    channel.on(SUBFRAME_POINTER_DOWN_EVENT, (_detail, sender) => {
        forwardSubframePointerDown(sender);
    });
    return channel;
}

export function forwardSubframePointerDown(sender) {
    const tabId = sender.tab?.id;
    if (!Number.isInteger(tabId) || !Number.isInteger(sender.frameId) || sender.frameId <= 0) {
        return false;
    }

    const message = JSON.stringify({
        type: "event",
        event: TOP_FRAME_POINTER_DOWN_EVENT,
    });
    chrome.tabs.sendMessage(tabId, message, { frameId: 0 }, () => {
        void chrome.runtime.lastError;
    });
    return true;
}
