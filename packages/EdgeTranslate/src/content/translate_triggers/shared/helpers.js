import { getDomain } from "common/scripts/common.js";
import { isPDFjsPDFViewer } from "../../common.js";
import { DEFAULT_SETTINGS, getOrSetDefaultSettings } from "common/scripts/settings.js";

export function getSelection() {
    const selection = window.getSelection();
    let text = selection.toString().trim();
    let position;
    if (selection.rangeCount > 0 && isPDFjsPDFViewer()) text = text.replace(/\n/g, " ");
    if (selection.rangeCount > 0) {
        const lastRange = selection.getRangeAt(selection.rangeCount - 1);
        if (lastRange.endContainer !== document.documentElement) {
            const rect = lastRange.getBoundingClientRect();
            position = [rect.left, rect.top];
        }
    }
    return { text, position };
}

export function shouldTranslate() {
    const selectionObject = window.getSelection();
    const selectionText = selectionObject.toString().trim();
    const filterNode = (node) => node?.nodeType === Node.TEXT_NODE || node?.tagName === "BODY";
    return (
        selectionText.length > 0 &&
        (filterNode(selectionObject.anchorNode) || filterNode(selectionObject.focusNode)) &&
        !(window.isDisplayingResult && window.translateResult.originalText === selectionText)
    );
}

export function isInBlacklist() {
    return getOrSetDefaultSettings("blacklist", DEFAULT_SETTINGS).then((result) => {
        const url = window.location.href;
        return result.blacklist.domains[getDomain(url)] || result.blacklist.urls[url];
    });
}

export function cancelTextSelection() {
    const selection = window.getSelection?.();
    if (selection?.empty) return selection.empty();
    if (selection?.removeAllRanges) return selection.removeAllRanges();
    if (document.selection) document.selection.empty();
}

export function cancelPageTranslate() {
    clickIfPresent(
        document.getElementById(":0.container")?.contentDocument?.getElementById(":0.close")
    );
    clickIfPresent(
        document
            .getElementById("OUTFOX_JTR_BAR")
            ?.contentDocument?.getElementById("OUTFOX_JTR_BAR_CLOSE")
    );
}

function clickIfPresent(button) {
    if (button !== null && button !== undefined) button.click();
}
