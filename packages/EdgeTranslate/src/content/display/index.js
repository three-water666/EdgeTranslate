/** @jsx h */
import { h, render } from "preact";
import { isNativePDFViewer } from "../common.js";
import Panel from "./Panel.jsx";
import { createPanelRoot } from "./panel/panel_top_layer.js";

(async function initialize() {
    if (isNativePDFViewer()) {
        return;
    }

    const mountNode = createPanelRoot();
    (document.body || document.documentElement).appendChild(mountNode);

    render(<Panel />, mountNode);
    // Prepare this polyfill for the useMeasure hook of "react-use".
    if (!window.ResizeObserver) {
        window.ResizeObserver = (await import("resize-observer-polyfill")).default;
    }
})();
