const PANEL_ROOT_ID = "edge-translate-root";
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
        inset: 0,
        zIndex: 2147483647,
        border: "none",
        padding: 0,
        margin: 0,
        background: "transparent",
        width: "100vw",
        height: "100vh",
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
        showModalPanelRoot(root);
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
    if (!root.open) openDialog(root);
    setLayerMode(root, LayerMode.Normal);
}

function hidePanelRoot(root) {
    if (getLayerMode(root) === LayerMode.Popover) hidePopover(root);
    if (root.open) closeDialog(root);
    setLayerMode(root, LayerMode.Normal);
}

function showModalPanelRoot(root) {
    if (typeof root.showModal !== "function") {
        showPanelRootNormally(root);
        return;
    }

    if (getLayerMode(root) === LayerMode.Popover) hidePopover(root);
    if (root.open) closeDialog(root);
    try {
        root.showModal();
        setLayerMode(root, LayerMode.Modal);
    } catch {
        showPanelRootNormally(root);
    }
}

function showPopoverPanelRoot(root) {
    if (typeof root.showPopover !== "function") {
        showPanelRootNormally(root);
        return;
    }

    if (getLayerMode(root) === LayerMode.Modal) closeDialog(root);
    if (!root.open) openDialog(root);
    try {
        root.showPopover();
        setLayerMode(root, LayerMode.Popover);
    } catch {
        showPanelRootNormally(root);
    }
}

function hasModalTopLayerBlocker(root) {
    if (document.fullscreenElement) return true;

    return Array.from(document.querySelectorAll("dialog[open]")).some(
        (dialog) => !isExtensionLayer(dialog, root)
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

function isExtensionLayer(element, root) {
    return element === root || element.id === PANEL_ROOT_ID || element.id === SCREENSHOT_OVERLAY_ID;
}

function openDialog(root) {
    if (typeof root.show === "function") {
        try {
            root.show();
            return;
        } catch {
            // Fall back to the open attribute below.
        }
    }

    root.setAttribute("open", "");
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
    root.style.pointerEvents = mode === LayerMode.Normal ? "none" : "auto";
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
