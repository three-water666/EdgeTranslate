import { isPDFjsPDFViewer, isNativePDFViewer, detectSelect } from "../common.js";
import Channel from "common/scripts/channel.js";
import { DEFAULT_SETTINGS, getOrSetDefaultSettings } from "common/scripts/settings.js";
import { createLongPressController } from "./select_long_press_controller.js";
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
    const longPressController = createLongPressController({
        cancelTextSelection,
        isInBlacklist,
        shouldTranslate,
        translateSelection: () => translateSubmit(state),
    });
    initializeButtonContainer(state, (event) => buttonClickHandler(state, event));
    initializeSettings(state, longPressController);
    registerDomEvents(state, longPressController);
    registerChannelEvents(state);
}

function createSelectState() {
    return {
        buttonPositionSetting: "TopRight",
        channel: new Channel(),
        hasButtonShown: false,
        originPositionX: 0,
        originPositionY: 0,
        originScrollX: 0,
        originScrollY: 0,
        screenshotSelector: createScreenshotSelector(),
        scrollPropertyX: "pageXOffset",
        scrollPropertyY: "pageYOffset",
        scrollingElement: window,
        translationButtonContainer: document.createElement("iframe"),
    };
}

function initializeSettings(state, longPressController) {
    getOrSetDefaultSettings("LayoutSettings", DEFAULT_SETTINGS).then((result) => {
        state.buttonPositionSetting = result.LayoutSettings.SelectTranslatePosition;
    });
    getOrSetDefaultSettings("OtherSettings", DEFAULT_SETTINGS).then((result) => {
        longPressController.setEnabled(Boolean(result.OtherSettings?.TranslateAfterLongPress));
    });
    chrome.storage.onChanged.addListener((changes, area) =>
        syncChangedSettings(state, changes, area, (enabled) =>
            longPressController.setEnabled(enabled)
        )
    );
}

function registerDomEvents(state, longPressController) {
    window.addEventListener("DOMContentLoaded", () =>
        initializeDomListeners(state, longPressController)
    );
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

function initializeDomListeners(state, longPressController) {
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
    document.addEventListener(
        "mousedown",
        (event) => longPressController.handleMouseDown(event),
        true
    );
    document.addEventListener(
        "mousemove",
        (event) => longPressController.handleMouseMove(event),
        true
    );
    document.addEventListener("mouseup", (event) => longPressController.handleMouseUp(event), true);
    document.addEventListener("click", (event) => longPressController.handleClick(event), true);
    document.addEventListener("dragstart", () => longPressController.cancel(), true);
    window.addEventListener("blur", () => longPressController.cancel());
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
