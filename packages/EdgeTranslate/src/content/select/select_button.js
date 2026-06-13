import { IMAGE_DATA } from "./select_constants.js";
import {
    applyButtonImageStyle,
    applyButtonStyle,
    getButtonPosition,
    getInnerParent,
    getSelection,
} from "./select_helpers.js";

const BUTTON_HOST_ID = "edge-translate-button-host";
const BUTTON_ID = "edge-translate-button";
const PANEL_ROOT_ID = "edge-translate-root";
const SCREENSHOT_OVERLAY_ID = "edge-translate-screenshot-overlay";
const BACKDROP_STYLE_ID = "edge-translate-button-host-backdrop-style";

const LayerMode = {
    Modal: "modal",
    Normal: "normal",
    Popover: "popover",
};

export function initializeButtonContainer(state, onMouseDown) {
    const iframeContainer = state.translationButtonContainer;
    document.documentElement.appendChild(state.translationButtonContainer);
    if (state.translationButtonContainer.contentDocument === null) {
        state.translationButtonContainer = document.createElement("div");
        renderButton(state, onMouseDown);
    }
    document.documentElement.removeChild(iframeContainer);
    state.translationButtonContainer.id = BUTTON_ID;
    state.translationButtonContainer.style.backgroundColor = "white";
    state.translationButtonContainer.style.pointerEvents = "auto";
    state.translationButtonHost = createButtonHost(state);
    state.translationButtonContainer.addEventListener("load", () =>
        renderButton(state, onMouseDown)
    );
}

export function showButton(state, event) {
    state.buttonSelection = getSelection();
    showButtonLayer(state);
    const position = getButtonPosition(
        state.buttonPositionSetting,
        state.translationButtonContainer,
        event
    );
    state.translationButtonContainer.style.top = `${position.top}px`;
    state.translationButtonContainer.style.left = `${position.left}px`;
    state.originScrollX = state.scrollingElement[state.scrollPropertyX];
    state.originScrollY = state.scrollingElement[state.scrollPropertyY];
    state.originPositionX = position.left;
    state.originPositionY = position.top;
    state.hasButtonShown = true;
}

export function scrollHandler(state) {
    if (!state.hasButtonShown) return;
    const distanceX = state.originScrollX - state.scrollingElement[state.scrollPropertyX];
    const distanceY = state.originScrollY - state.scrollingElement[state.scrollPropertyY];
    state.translationButtonContainer.style.left = `${state.originPositionX + distanceX}px`;
    state.translationButtonContainer.style.top = `${state.originPositionY + distanceY}px`;
}

export function disappearButton(state) {
    if (!state.hasButtonShown) return;
    closeButtonHost(state.translationButtonHost);
    if (document.documentElement.contains(state.translationButtonContainer)) {
        document.documentElement.removeChild(state.translationButtonContainer);
    }
    state.hasButtonShown = false;
    state.buttonSelection = null;
}

function renderButton(state, onMouseDown) {
    const buttonImage = document.createElement("img");
    const translationButton = document.createElement("div");
    const cleanStyle = { padding: 0, margin: 0, border: "none", overflow: "hidden" };

    buttonImage.src = IMAGE_DATA;
    applyButtonImageStyle(buttonImage);
    applyButtonStyle(translationButton);
    translationButton.appendChild(buttonImage);
    getInnerParent(state.translationButtonContainer).appendChild(translationButton);
    Object.assign(
        state.translationButtonContainer.contentDocument?.documentElement.style || {},
        cleanStyle
    );
    Object.assign(state.translationButtonContainer.contentDocument?.body.style || {}, cleanStyle);
    translationButton.addEventListener("mousedown", onMouseDown);
    translationButton.addEventListener("contextmenu", (event) => event.preventDefault());
}

function createButtonHost(state) {
    const host = document.createElement("dialog");
    host.id = BUTTON_HOST_ID;
    host.popover = "manual";
    host.dataset.edgeTranslateLayerMode = LayerMode.Normal;
    Object.assign(host.style, {
        position: "fixed",
        display: "block",
        top: 0,
        left: 0,
        zIndex: 2147483647,
        border: "none",
        padding: 0,
        margin: 0,
        background: "transparent",
        width: 0,
        height: 0,
        minWidth: 0,
        minHeight: 0,
        maxWidth: "none",
        maxHeight: "none",
        pointerEvents: "none",
        overflow: "visible",
    });
    host.addEventListener("cancel", (event) => {
        event.preventDefault();
        disappearButton(state);
    });
    host.addEventListener("mousedown", (event) => dismissFromHost(event, state), true);
    ensureTransparentBackdropStyle();
    return host;
}

function showButtonLayer(state) {
    const host = state.translationButtonHost;
    if (hasModalTopLayerBlocker(host) || hasOpenPopover(host)) {
        showButtonHost(state);
        return;
    }

    showNormalButton(state);
}

function showNormalButton(state) {
    closeButtonHost(state.translationButtonHost);
    if (!document.documentElement.contains(state.translationButtonContainer)) {
        document.documentElement.appendChild(state.translationButtonContainer);
    }
}

function showButtonHost(state) {
    const host = state.translationButtonHost;
    if (!host.contains(state.translationButtonContainer)) {
        host.appendChild(state.translationButtonContainer);
    }
    if (!document.documentElement.contains(host)) {
        document.documentElement.appendChild(host);
    }

    if (hasModalTopLayerBlocker(host)) {
        showPopoverButtonHost(state);
        return;
    }
    if (hasOpenPopover(host)) {
        showPopoverButtonHost(state);
        return;
    }
    showNormalButton(state);
}

function showPopoverButtonHost(state) {
    const host = state.translationButtonHost;
    if (typeof host.showPopover !== "function") {
        showNormalButton(state);
        return;
    }

    if (getLayerMode(host) === LayerMode.Modal) closeDialog(host);
    try {
        host.showPopover();
        setLayerMode(host, LayerMode.Popover);
    } catch {
        showNormalButton(state);
    }
}

function closeButtonHost(host) {
    if (!host) return;
    if (getLayerMode(host) === LayerMode.Popover) hidePopover(host);
    if (host.open) closeDialog(host);
    setLayerMode(host, LayerMode.Normal);
    if (document.documentElement.contains(host)) {
        document.documentElement.removeChild(host);
    }
}

function hasModalTopLayerBlocker(host) {
    if (document.fullscreenElement) return true;

    return Array.from(document.querySelectorAll("dialog")).some(
        (dialog) => !isExtensionLayer(dialog, host) && isModalDialog(dialog)
    );
}

function hasOpenPopover(host) {
    return Array.from(document.querySelectorAll("[popover]")).some(
        (element) => !isExtensionLayer(element, host) && isPopoverOpen(element)
    );
}

function isModalDialog(dialog) {
    try {
        return dialog.matches(":modal");
    } catch {
        return dialog.open;
    }
}

function isPopoverOpen(element) {
    try {
        return element.matches(":popover-open");
    } catch {
        return false;
    }
}

function isExtensionLayer(element, host) {
    return (
        element === host ||
        element.id === BUTTON_HOST_ID ||
        element.id === BUTTON_ID ||
        element.id === PANEL_ROOT_ID ||
        element.id === SCREENSHOT_OVERLAY_ID
    );
}

function closeDialog(host) {
    if (typeof host.close === "function") {
        try {
            host.close();
            return;
        } catch {
            // Fall back to removing the open attribute below.
        }
    }

    host.removeAttribute("open");
}

function hidePopover(host) {
    if (typeof host.hidePopover !== "function") return;

    try {
        host.hidePopover();
    } catch {
        // The host may already be hidden or the browser may not support popovers.
    }
}

function getLayerMode(host) {
    return host.dataset.edgeTranslateLayerMode || LayerMode.Normal;
}

function setLayerMode(host, mode) {
    host.dataset.edgeTranslateLayerMode = mode;
    host.style.pointerEvents = "none";
}

function dismissFromHost(event, state) {
    if (event.target !== state.translationButtonHost) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    disappearButton(state);
}

function ensureTransparentBackdropStyle() {
    if (document.getElementById(BACKDROP_STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = BACKDROP_STYLE_ID;
    style.textContent = `#${BUTTON_HOST_ID}::backdrop { background: transparent; }`;
    (document.head || document.documentElement).appendChild(style);
}
