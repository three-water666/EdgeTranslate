import Channel from "common/scripts/channel.js";

export const panelChannel = new Channel();

window.translateResult = window.translateResult || {};
window.isDisplayingResult = false;

/**
 * Check whether the translation result is the latest.
 * @param {number} timestamp the timestamp of the new translation result
 * @returns true if the result is the latest
 */
export function checkTimestamp(timestamp) {
    if (window.translateResult.timestamp) {
        if (window.translateResult.timestamp > timestamp) {
            return false;
        }
        window.translateResult.timestamp = timestamp;
    }
    return true;
}
