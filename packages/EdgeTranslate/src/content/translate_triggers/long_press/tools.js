import { getLongPressRangeFromPoint } from "./range.js";
import { createLongPressHighlighter } from "./highlight.js";
import { getActionTarget, shouldIgnoreTarget } from "./target.js";

/**
 * 创建长按取词需要的工具集合。
 */
export function createLongPressTools() {
    const highlighter = createLongPressHighlighter();

    return {
        clearHighlight: highlighter.clear,
        getActionTarget,
        getRangeFromPoint: getLongPressRangeFromPoint,
        renderHighlight: highlighter.render,
        shouldIgnoreTarget,
    };
}
