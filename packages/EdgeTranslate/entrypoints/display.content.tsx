import { h, render } from "preact";
import Panel from "../components/display/Panel.jsx";

export default defineContentScript({
    matches: ["<all_urls>"],
    async main() {
        render(<Panel />, document.documentElement);
        // Prepare this polyfill for the useMeasure hook of "react-use".
        if (!window.ResizeObserver) {
            window.ResizeObserver = (await import("resize-observer-polyfill")).default;
        }
    },
});
