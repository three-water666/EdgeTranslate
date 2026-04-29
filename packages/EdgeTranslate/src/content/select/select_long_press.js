import { getLongPressRangeFromPoint } from "./select_long_press_range.js";
import { createLongPressHighlighter } from "./select_long_press_highlight.js";
import { getActionTarget, shouldIgnoreTarget } from "./select_long_press_target.js";

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
