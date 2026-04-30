// 负责组装长按翻译控制器依赖的取词、高亮和目标过滤工具。
import { getLongPressRangeFromPoint } from "./range/index.js";
import { createLongPressHighlighter } from "./highlight/index.js";
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
