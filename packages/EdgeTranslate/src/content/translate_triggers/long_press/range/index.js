// 负责按优先级调度长按取词策略并返回最终文本范围。
import { getBlockRangeFromPoint } from "./block/index.js";
import { getChunkRangeFromPoint } from "./chunk/index.js";
import { getNativeParagraphRangeFromPoint } from "./native_paragraph/index.js";

/**
 * 根据页面坐标获取长按应翻译的文本范围。
 */
export function getLongPressRangeFromPoint(x, y) {
    return (
        getBlockRangeFromPoint(x, y) ||
        getNativeParagraphRangeFromPoint(x, y) ||
        getChunkRangeFromPoint(x, y)
    );
}
