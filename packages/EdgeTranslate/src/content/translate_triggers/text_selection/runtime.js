import { detectSelect, isPDFjsPDFViewer } from "../../common.js";
import { DEFAULT_SETTINGS, getOrSetDefaultSettings } from "common/scripts/settings.js";
import { isInBlacklist, shouldTranslate } from "../shared/helpers.js";
import { disappearButton, initializeButtonContainer, scrollHandler, showButton } from "./button.js";

export function createTextSelectionTrigger(options) {
    const state = createTextSelectionState(options);
    return {
        initialize: () => initializeTextSelectionTrigger(state),
    };
}

function createTextSelectionState(options) {
    return {
        buttonPositionSetting: "TopRight",
        hasButtonShown: false,
        originPositionX: 0,
        originPositionY: 0,
        originScrollX: 0,
        originScrollY: 0,
        scrollPropertyX: "pageXOffset",
        scrollPropertyY: "pageYOffset",
        scrollingElement: window,
        textActions: options.textActions,
        translationButtonContainer: document.createElement("iframe"),
    };
}

function initializeTextSelectionTrigger(state) {
    initializeButtonContainer(state, (event) => buttonClickHandler(state, event));
    initializeSettings(state);
    registerDomEvents(state);
}

function initializeSettings(state) {
    getOrSetDefaultSettings("LayoutSettings", DEFAULT_SETTINGS).then((result) => {
        state.buttonPositionSetting = result.LayoutSettings.SelectTranslatePosition;
    });
    chrome.storage.onChanged.addListener((changes, area) =>
        syncTextSelectionSettings(state, changes, area)
    );
}

function syncTextSelectionSettings(state, changes, area) {
    if (area !== "sync" || !changes.LayoutSettings) return;
    state.buttonPositionSetting = changes.LayoutSettings.newValue.SelectTranslatePosition;
}

function registerDomEvents(state) {
    window.addEventListener("DOMContentLoaded", () => initializeDomListeners(state));
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
                translateSelectedText(state);
            } else if (otherSettings.SelectTranslate) {
                showButton(state, event);
            }
        });
    });
}

function buttonClickHandler(state, event) {
    event.preventDefault();
    event.stopPropagation();
    if (event.button === 0) {
        translateSelectedText(state);
    } else if (event.button === 2) {
        state.textActions.pronounce();
    }
}

function translateSelectedText(state, options = {}) {
    state.textActions.translate(options).then((translated) => {
        if (translated) disappearButton(state);
    });
}
