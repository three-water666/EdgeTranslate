import {
    getActionTarget,
    getHighlightRects,
    getLongPressRangeFromPoint,
    shouldIgnoreTarget,
} from "./select_long_press_core.js";

/**
 * 创建长按取词需要的工具集合，并维护高亮容器的生命周期。
 */
export function createLongPressTools() {
    let highlightContainer = null;

    return {
        clearHighlight,
        getActionTarget,
        getRangeFromPoint: getLongPressRangeFromPoint,
        renderHighlight,
        shouldIgnoreTarget,
    };

    /**
     * 根据选中的文本范围渲染长按预览高亮。
     */
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

    /**
     * 清理当前长按预览高亮和对应 DOM 容器。
     */
    function clearHighlight() {
        if (!highlightContainer) return;
        highlightContainer.replaceChildren();
        highlightContainer.parentNode?.removeChild(highlightContainer);
        highlightContainer = null;
    }
}
