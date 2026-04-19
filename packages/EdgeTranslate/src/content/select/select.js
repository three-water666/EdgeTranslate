import { isPDFjsPDFViewer, isNativePDFViewer, detectSelect } from "../common.js";
import Channel from "common/scripts/channel.js";
import { DEFAULT_SETTINGS, getOrSetDefaultSettings } from "common/scripts/settings.js";
import {
    LONG_PRESS_DURATION,
    LONG_PRESS_PREVIEW_DELAY,
    LONG_PRESS_MOVE_THRESHOLD,
} from "./select_constants.js";
import { createLongPressTools } from "./select_long_press.js";
import { createScreenshotSelector } from "./select_screenshot.js";
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

if (!isNativePDFViewer()) {
    initSelectTranslate();
}

function initSelectTranslate() {
    const state = createSelectState();
    initializeButtonContainer(state, (event) => buttonClickHandler(state, event));
    initializeSettings(state);
    registerDomEvents(state);
    registerChannelEvents(state);
}

function createSelectState() {
    return {
        buttonPositionSetting: "TopRight",
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

function longPressStartHandler(state, event) {
    if (!canStartLongPress(state, event)) {
        cancelLongPressSession(state);
        return;
    }
    if (window.getSelection().toString().trim()) cancelTextSelection();
    state.longPressSession = createLongPressSession(state, event);
}

function longPressMoveHandler(state, event) {
    if (!state.longPressSession) return;
    if (!hasLongPressMoved(state.longPressSession, event)) return;
    state.longPressSession.moved = true;
    state.tools.clearHighlight();
}

function longPressEndHandler(state, event) {
    const session = state.longPressSession;
    cancelLongPressSession(state);
    if (!session || event.button !== 0 || !session.triggered) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
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
    const selection = getSelection();
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

function pronounceSubmit(state) {
    const selection = getSelection();
    if (!selection.text?.length) return;
    state.channel.request("pronounce", { text: selection.text, language: "auto" });
}

function cancelLongPressSession(state) {
    if (state.longPressSession?.previewTimer)
        window.clearTimeout(state.longPressSession.previewTimer);
    if (state.longPressSession?.translateTimer)
        window.clearTimeout(state.longPressSession.translateTimer);
    state.tools.clearHighlight();
    state.longPressSession = null;
}

function triggerLongPressTranslate(state, session) {
    if (!state.longPressEnabled || window.getSelection().toString().trim()) {
        return Promise.resolve();
    }
    return isInBlacklist().then((inBlacklist) => {
        if (inBlacklist) return;
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

function canStartLongPress(state, event) {
    return (
        state.longPressEnabled &&
        event.button === 0 &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !event.shiftKey &&
        !state.tools.shouldIgnoreTarget(event.target)
    );
}

function createLongPressSession(state, event) {
    return {
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
        triggered: false,
        target: state.tools.getActionTarget(event.target),
        previewRange: null,
        previewTimer: window.setTimeout(
            () => previewLongPressRange(state),
            LONG_PRESS_PREVIEW_DELAY
        ),
        translateTimer: window.setTimeout(
            () => triggerLongPressTranslate(state, state.longPressSession),
            LONG_PRESS_DURATION
        ),
    };
}

function previewLongPressRange(state) {
    if (!state.longPressSession || state.longPressSession.moved) return;
    state.longPressSession.previewRange = state.tools.getRangeFromPoint(
        state.longPressSession.startX,
        state.longPressSession.startY
    );
    state.tools.renderHighlight(state.longPressSession.previewRange);
}

function hasLongPressMoved(session, event) {
    return (
        Math.abs(event.clientX - session.startX) > LONG_PRESS_MOVE_THRESHOLD ||
        Math.abs(event.clientY - session.startY) > LONG_PRESS_MOVE_THRESHOLD
    );
}

function shouldPreventLongPressClick(state, event) {
    if (!state.longPressPreventClickTarget || Date.now() > state.longPressPreventClickUntil) {
        state.longPressPreventClickTarget = null;
        state.longPressPreventClickUntil = 0;
        return false;
    }
    return (
        event.target instanceof Element &&
        (event.target === state.longPressPreventClickTarget ||
            state.longPressPreventClickTarget.contains(event.target) ||
            event.target.contains(state.longPressPreventClickTarget) ||
            event.composedPath?.().includes(state.longPressPreventClickTarget))
    );
}
