import { LONG_PRESS_HIGHLIGHT_ID } from "../shared/constants.js";
import { getVisibleRangeRects } from "./rects.js";

/**
 * 创建长按预览高亮渲染器，并维护高亮容器生命周期。
 */
export function createLongPressHighlighter() {
    let highlightContainer = null;

    return {
        clear: clearHighlight,
        render: renderHighlight,
    };

    /**
     * 根据选中的文本范围渲染长按预览高亮。
     */
    function renderHighlight(range) {
        clearHighlight();
        if (!range) return;
        const rects = getVisibleRangeRects(range);
        if (!rects.length) return;
        ensureHighlightContainer();
        rects.forEach((rect) => highlightContainer.appendChild(createHighlightBlock(rect)));
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

    function ensureHighlightContainer() {
        if (highlightContainer) return;
        highlightContainer = document.createElement("div");
        highlightContainer.id = LONG_PRESS_HIGHLIGHT_ID;
        document.documentElement.appendChild(highlightContainer);
    }
}

function createHighlightBlock(rect) {
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
    return block;
}
