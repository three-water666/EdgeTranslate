import { SUBFRAME_POINTER_DOWN_EVENT } from "common/scripts/frame_events.js";

const EXTENSION_UI_IDS = new Set([
    "edge-translate-button",
    "edge-translate-button-host",
    "edge-translate-root",
    "edge-translate-screenshot-overlay",
    "edge-translate-long-press-highlight",
]);

export function registerSubframePointerDownBridge(channel) {
    if (window.top === window) return;

    document.addEventListener(
        "mousedown",
        (event) => {
            if (isExtensionOwnedPointerEvent(event)) return;
            channel.emit(SUBFRAME_POINTER_DOWN_EVENT);
        },
        true
    );
}

export function isExtensionOwnedPointerEvent(event) {
    const path = event.composedPath?.() || [event.target];
    return path.some((node) => EXTENSION_UI_IDS.has(node?.id));
}
