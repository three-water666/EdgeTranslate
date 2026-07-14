import { isPDFjsPDFViewer, isNativePDFViewer, detectSelect } from "../common.js";
import Channel from "common/scripts/channel.js";
import { DEFAULT_SETTINGS, getOrSetDefaultSettings } from "common/scripts/settings.js";
import {
    cancelLongPressSession,
    canStartLongPress,
    createLongPressSession,
    finishLongPressMouseUp,
    hasLongPressMoved,
    shouldPreventLongPressClick,
} from "./select_long_press_events.js";
import { createLongPressTools } from "./select_long_press.js";
import { selectionMatchesSnapshot } from "./select_long_press_utils.js";
import { createScreenshotSelector } from "./select_screenshot.js";
import {
    isExtensionOwnedFrame,
    registerSubframePointerDownBridge,
} from "./frame_pointer_bridge.js";
import {
    getSelection,
    shouldTranslate,
    isInBlacklist,
    cancelTextSelection,
    cancelPageTranslate,
    syncChangedSettings,
} from "./select_helpers.js";
import {
    initializeButtonContainer,
    showButton,
    scrollHandler,
    disappearButton,
} from "./select_button.js";

if (!isExtensionOwnedFrame() && !isNativePDFViewer()) {
    initSelectTranslate();
}

function initSelectTranslate() {
    const state = createSelectState();
    registerSubframePointerDownBridge(state.channel);
    initializeButtonContainer(state, (event) => buttonClickHandler(state, event));
    initializeSettings(state);
    registerDomEvents(state);
    registerChannelEvents(state);
}

function createSelectState() {
    return {
        buttonPositionSetting: "TopRight",
        buttonSelection: null,
        channel: new Channel(),
        hasButtonShown: false,
        longPressEnabled: false,
        longPressPreventClickTarget: null,
        longPressPreventClickUntil: 0,
        longPressSession: null,
        originPositionX: 0,
        originPositionY: 0,
        originScrollX: 0,
        originScrollY: 0,
        screenshotSelector: createScreenshotSelector(),
        scrollPropertyX: "pageXOffset",
        scrollPropertyY: "pageYOffset",
        scrollingElement: window,
        tools: createLongPressTools(),
        translationButtonContainer: document.createElement("iframe"),
        translationButtonHost: null,
    };
}

function initializeSettings(state) {
    getOrSetDefaultSettings("LayoutSettings", DEFAULT_SETTINGS).then((result) => {
        state.buttonPositionSetting = result.LayoutSettings.SelectTranslatePosition;
    });
    getOrSetDefaultSettings("OtherSettings", DEFAULT_SETTINGS).then((result) => {
        state.longPressEnabled = Boolean(result.OtherSettings?.TranslateAfterLongPress);
    });
    chrome.storage.onChanged.addListener((changes, area) =>
        syncChangedSettings(state, changes, area, cancelLongPressSession)
    );
}

function registerDomEvents(state) {
    window.addEventListener("DOMContentLoaded", () => initializeDomListeners(state));
}

function registerChannelEvents(state) {
    state.channel.provide("get_selection", () => Promise.resolve(getSelection()));
    if (window.top === window) {
        state.channel.provide("select_capture_area", () =>
            Promise.resolve(state.screenshotSelector.start())
        );
    }
    state.channel.on("command", (detail) => handleCommand(state, detail));
}

function initializeDomListeners(state) {
    if (isPDFjsPDFViewer()) {
        state.scrollingElement = document.getElementById("viewerContainer");
        state.scrollPropertyX = "scrollLeft";
        state.scrollPropertyY = "scrollTop";
    }
    state.scrollingElement.addEventListener("scroll", () => scrollHandler(state));
    document.addEventListener("mousedown", () => {
        disappearButton(state);
        detectSelect(document, (event) => selectTranslate(state, event));
    });
    document.addEventListener("mousedown", (event) => longPressStartHandler(state, event), true);
    document.addEventListener("mousemove", (event) => longPressMoveHandler(state, event), true);
    document.addEventListener("mouseup", (event) => longPressEndHandler(state, event), true);
    document.addEventListener("click", (event) => longPressClickHandler(state, event), true);
    document.addEventListener("dragstart", () => cancelLongPressSession(state), true);
    window.addEventListener("blur", () => cancelLongPressSession(state));
    document.addEventListener("dblclick", (event) => selectTranslate(state, event, true));
    document.addEventListener("click", (event) => {
        if (event.detail === 3) selectTranslate(state, event, true);
    });
}

function selectTranslate(state, event, isDoubleClick = false) {
    if (!shouldTranslate()) return;
    isInBlacklist().then((inBlacklist) => {
        if (inBlacklist) return;
        getOrSetDefaultSettings("OtherSettings", DEFAULT_SETTINGS).then((result) => {
            const otherSettings = result.OtherSettings;
            if (!otherSettings) return;
            if (
                otherSettings.TranslateAfterSelect ||
                (isDoubleClick && otherSettings.TranslateAfterDblClick)
            ) {
                translateSubmit(state);
            } else if (otherSettings.SelectTranslate) {
                showButton(state, event);
            }
        });
    });
}

function buttonClickHandler(state, event) {
    event.preventDefault();
    event.stopPropagation();
    if (event.button === 0) translateSubmit(state);
    else if (event.button === 2) pronounceSubmit(state);
}

export function longPressStartHandler(state, event) {
    if (!canStartLongPress(state, event)) {
        cancelLongPressSession(state);
        return;
    }
    // A normal click may target page UI that depends on the current selection.
    // Replace it only after the long press is confirmed in selectTextAtPoint.
    state.longPressSession = createLongPressSession(state, event, () =>
        triggerLongPressTranslate(state, state.longPressSession)
    );
}

function longPressMoveHandler(state, event) {
    if (!state.longPressSession) return;
    if (!hasLongPressMoved(state.longPressSession, event)) return;
    state.longPressSession.moved = true;
    state.tools.clearHighlight();
}

function longPressEndHandler(state, event) {
    finishLongPressMouseUp(state, event);
}

function longPressClickHandler(state, event) {
    if (!shouldPreventLongPressClick(state, event)) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    state.longPressPreventClickTarget = null;
    state.longPressPreventClickUntil = 0;
}

function handleCommand(state, detail) {
    switch (detail.command) {
        case "translate_selected":
            translateSubmit(state);
            break;
        case "pronounce_selected":
            pronounceSubmit(state);
            break;
        case "cancel_page_translate":
            cancelPageTranslate();
            break;
        default:
            break;
    }
}

function translateSubmit(state, options = {}) {
    const selection = getSelectionForButtonAction(state);
    if (!selection.text?.length) return;
    state.channel.request("translate", selection).then(() => {
        getOrSetDefaultSettings("OtherSettings", DEFAULT_SETTINGS).then((result) => {
            if (
                Boolean(options.clearSelectionAfterTranslate) ||
                result.OtherSettings?.CancelTextSelection
            ) {
                cancelTextSelection();
            }
        });
        disappearButton(state);
    });
}

function getSelectionForButtonAction(state) {
    const selection = getSelection();
    if (selection.text?.length) return selection;
    if (state.buttonSelection?.text?.length) return state.buttonSelection;
    return selection;
}

function pronounceSubmit(state) {
    const selection = getSelectionForButtonAction(state);
    if (!selection.text?.length) return;
    state.channel.request("pronounce", { text: selection.text, language: "auto" });
}

export function triggerLongPressTranslate(state, session) {
    if (!state.longPressEnabled || !session || session.moved) {
        return Promise.resolve();
    }
    return isInBlacklist().then((inBlacklist) => {
        if (inBlacklist) return;
        const selection = window.getSelection();
        if (
            selection?.toString().trim() &&
            !selectionMatchesSnapshot(selection, session.initialSelection)
        ) {
            state.tools.clearHighlight();
            return;
        }
        if (
            !selectTextAtPoint(state, session.startX, session.startY, session.previewRange) ||
            !shouldTranslate()
        ) {
            return;
        }
        session.triggered = true;
        state.longPressPreventClickTarget =
            session.target ||
            state.tools.getActionTarget(document.elementFromPoint(session.startX, session.startY));
        state.longPressPreventClickUntil = Date.now() + 1000;
        state.tools.clearHighlight();
        translateSubmit(state);
    });
}

function selectTextAtPoint(state, x, y, existingRange) {
    const range = existingRange?.cloneRange() || state.tools.getRangeFromPoint(x, y);
    if (!range || range.collapsed) return false;
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    return selection.toString().trim().length > 0;
}
