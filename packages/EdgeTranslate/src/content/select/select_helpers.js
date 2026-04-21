import { getDomain } from "common/scripts/common.js";
import { isPDFjsPDFViewer } from "../common.js";
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

export function getInnerParent(container) {
    if (container.tagName === "IFRAME") return container.contentDocument.body;
    if (!container.shadowRoot) container.attachShadow({ mode: "open" });
    return container.shadowRoot;
}

export function getButtonPosition(positionSetting, container, event) {
    const offset = resolveButtonOffset(positionSetting, container);
    let left = event.x + offset.x;
    let top = event.y + offset.y;
    if (left <= 0 || left + container.clientWidth > window.innerWidth) {
        left = event.x - offset.x - container.clientWidth;
    }
    if (top <= 0 || top + container.clientHeight > window.innerHeight) {
        top = event.y - offset.y - container.clientHeight;
    }
    return { left, top };
}

export function syncChangedSettings(state, changes, area, cancelLongPressSession) {
    if (area !== "sync") return;
    if (changes.LayoutSettings) {
        state.buttonPositionSetting = changes.LayoutSettings.newValue.SelectTranslatePosition;
    }
    if (changes.OtherSettings) {
        state.longPressEnabled = Boolean(changes.OtherSettings.newValue?.TranslateAfterLongPress);
        if (!state.longPressEnabled) cancelLongPressSession(state);
    }
}

export function applyButtonImageStyle(buttonImage) {
    const buttonSize = "20px";
    Object.assign(buttonImage.style, {
        width: buttonSize,
        height: buttonSize,
        minWidth: 0,
        maxWidth: buttonSize,
        minHeight: 0,
        maxHeight: buttonSize,
        padding: 0,
        border: 0,
        margin: 0,
        verticalAlign: 0,
        filter: "none",
    });
}

export function applyButtonStyle(translationButton) {
    const buttonSize = "20px";
    Object.assign(translationButton.style, {
        width: buttonSize,
        height: buttonSize,
        padding: "6px",
        margin: 0,
        borderRadius: "50%",
        boxSizing: "content-box",
        overflow: "hidden",
        border: "none",
        cursor: "pointer",
    });
}

function resolveButtonOffset(position, container) {
    const offsetX = 10;
    const offsetY = 20;
    switch (position) {
        case "TopLeft":
            return { x: -offsetX - container.clientWidth, y: -offsetY - container.clientHeight };
        case "BottomRight":
            return { x: offsetX, y: offsetY };
        case "BottomLeft":
            return { x: -offsetX - container.clientWidth, y: offsetY };
        case "TopRight":
        default:
            return { x: offsetX, y: -offsetY - container.clientHeight };
    }
}

function clickIfPresent(button) {
    if (button !== null && button !== undefined) button.click();
}
