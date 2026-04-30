import { DEFAULT_SETTINGS, getOrSetDefaultSettings } from "common/scripts/settings.js";
import { cancelTextSelection, getSelection } from "./helpers.js";

export function createTextActions({ channel }) {
    return {
        pronounce: () => pronounceSelection(channel),
        translate: (options = {}) => translateSelection(channel, options),
    };
}

function translateSelection(channel, options = {}) {
    const selection = getSelection();
    if (!selection.text?.length) return Promise.resolve(false);
    return channel.request("translate", selection).then(() => {
        maybeCancelSelection(options);
        return true;
    });
}

function maybeCancelSelection(options) {
    getOrSetDefaultSettings("OtherSettings", DEFAULT_SETTINGS).then((result) => {
        if (
            Boolean(options.clearSelectionAfterTranslate) ||
            result.OtherSettings?.CancelTextSelection
        ) {
            cancelTextSelection();
        }
    });
}

function pronounceSelection(channel) {
    const selection = getSelection();
    if (!selection.text?.length) return Promise.resolve(false);
    return channel
        .request("pronounce", { text: selection.text, language: "auto" })
        .then(() => true);
}
