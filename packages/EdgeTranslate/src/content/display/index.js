/** @jsx h */
import { h, render } from "preact";
import { isNativePDFViewer } from "../common.js";
import Panel from "./Panel.jsx";

(async function initialize() {
    if (isNativePDFViewer()) {
        return;
    }

    const mountNode = document.createElement("div");
    mountNode.id = "edge-translate-root";
    mountNode.popover = "manual";
    Object.assign(mountNode.style, {
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        border: "none",
        padding: 0,
        margin: 0,
        background: "transparent",
        width: "100%",
        height: "100%",
        maxWidth: "none",
        maxHeight: "none",
        pointerEvents: "none",
        overflow: "visible",
    });
    (document.body || document.documentElement).appendChild(mountNode);

    try {
        mountNode.showPopover();
    } catch (e) {
        // Fallback
    }

    render(<Panel />, mountNode);
    // Prepare this polyfill for the useMeasure hook of "react-use".
    if (!window.ResizeObserver) {
        window.ResizeObserver = (await import("resize-observer-polyfill")).default;
    }
})();
