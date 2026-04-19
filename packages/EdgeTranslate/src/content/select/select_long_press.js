import {
    getActionTarget,
    getHighlightRects,
    getLongPressRangeFromPoint,
    shouldIgnoreTarget,
} from "./select_long_press_core.js";

export function createLongPressTools() {
    let highlightContainer = null;

    return {
        clearHighlight,
        getActionTarget,
        getRangeFromPoint: getLongPressRangeFromPoint,
        renderHighlight,
        shouldIgnoreTarget,
    };

    function renderHighlight(range) {
        clearHighlight();
        if (!range) return;
        const rects = getHighlightRects(range);
        if (!rects.length) return;
        if (!highlightContainer) {
            highlightContainer = document.createElement("div");
            highlightContainer.id = "edge-translate-long-press-highlight";
            document.documentElement.appendChild(highlightContainer);
        }
        rects.forEach((rect) => {
            const block = document.createElement("div");
            Object.assign(block.style, {
                position: "fixed",
                left: `${rect.left}px`,
                top: `${rect.top}px`,
                width: `${rect.width}px`,
                height: `${rect.height}px`,
                borderRadius: "4px",
                background: "rgba(74, 140, 247, 0.16)",
                boxShadow: "inset 0 0 0 1px rgba(74, 140, 247, 0.2)",
            });
            highlightContainer.appendChild(block);
        });
    }

    function clearHighlight() {
        if (!highlightContainer) return;
        highlightContainer.replaceChildren();
        highlightContainer.parentNode?.removeChild(highlightContainer);
        highlightContainer = null;
    }
}
