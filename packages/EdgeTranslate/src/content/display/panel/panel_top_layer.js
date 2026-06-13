const PANEL_ROOT_ID = "edge-translate-root";
const BUTTON_HOST_ID = "edge-translate-button-host";
const SCREENSHOT_OVERLAY_ID = "edge-translate-screenshot-overlay";
const BACKDROP_STYLE_ID = "edge-translate-root-backdrop-style";

const LayerMode = {
    Modal: "modal",
    Normal: "normal",
    Popover: "popover",
};

function createPanelRoot() {
    const root = document.createElement("dialog");
    root.id = PANEL_ROOT_ID;
    root.popover = "manual";
    root.dataset.edgeTranslateLayerMode = LayerMode.Normal;
    Object.assign(root.style, {
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
    root.addEventListener("cancel", preventDialogDefaultClose);
    ensureTransparentBackdropStyle();
    return root;
}

function syncPanelRootTopLayer(open) {
    const root = document.getElementById(PANEL_ROOT_ID);
    if (!root) return;

    if (!open) {
        hidePanelRoot(root);
        return;
    }

    if (hasModalTopLayerBlocker(root)) {
        showPopoverPanelRoot(root);
        return;
    }

    if (hasOpenPopover(root)) {
        showPopoverPanelRoot(root);
        return;
    }

    showPanelRootNormally(root);
}

function showPanelRootNormally(root) {
    if (getLayerMode(root) === LayerMode.Popover) hidePopover(root);
    if (getLayerMode(root) === LayerMode.Modal) closeDialog(root);
    setLayerMode(root, LayerMode.Normal);
}

function hidePanelRoot(root) {
    if (getLayerMode(root) === LayerMode.Popover) hidePopover(root);
    if (root.open) closeDialog(root);
    setLayerMode(root, LayerMode.Normal);
}

function showPopoverPanelRoot(root) {
    if (typeof root.showPopover !== "function") {
        showPanelRootNormally(root);
        return;
    }

    if (getLayerMode(root) === LayerMode.Modal) closeDialog(root);
    try {
        root.showPopover();
        setLayerMode(root, LayerMode.Popover);
    } catch {
        showPanelRootNormally(root);
    }
}

function hasModalTopLayerBlocker(root) {
    if (document.fullscreenElement) return true;

    return Array.from(document.querySelectorAll("dialog")).some(
        (dialog) => !isExtensionLayer(dialog, root) && isModalDialog(dialog)
    );
}

function hasOpenPopover(root) {
    return Array.from(document.querySelectorAll("[popover]")).some(
        (element) => !isExtensionLayer(element, root) && isPopoverOpen(element)
    );
}

function isPopoverOpen(element) {
    try {
        return element.matches(":popover-open");
    } catch {
        return false;
    }
}

function isModalDialog(dialog) {
    try {
        return dialog.matches(":modal");
    } catch {
        return dialog.open;
    }
}

function isExtensionLayer(element, root) {
    return (
        element === root ||
        element.id === PANEL_ROOT_ID ||
        element.id === BUTTON_HOST_ID ||
        element.id === SCREENSHOT_OVERLAY_ID
    );
}

function closeDialog(root) {
    if (typeof root.close === "function") {
        try {
            root.close();
            return;
        } catch {
            // Fall back to removing the open attribute below.
        }
    }

    root.removeAttribute("open");
}

function hidePopover(root) {
    if (typeof root.hidePopover !== "function") return;

    try {
        root.hidePopover();
    } catch {
        // The root may already be hidden or the browser may not support popovers.
    }
}

function getLayerMode(root) {
    return root.dataset.edgeTranslateLayerMode || LayerMode.Normal;
}

function setLayerMode(root, mode) {
    root.dataset.edgeTranslateLayerMode = mode;
    root.style.pointerEvents = "none";
}

function preventDialogDefaultClose(event) {
    event.preventDefault();
}

function ensureTransparentBackdropStyle() {
    if (document.getElementById(BACKDROP_STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = BACKDROP_STYLE_ID;
    style.textContent = `#${PANEL_ROOT_ID}::backdrop { background: transparent; }`;
    (document.head || document.documentElement).appendChild(style);
}

export { createPanelRoot, showPanelRootNormally, syncPanelRootTopLayer };
