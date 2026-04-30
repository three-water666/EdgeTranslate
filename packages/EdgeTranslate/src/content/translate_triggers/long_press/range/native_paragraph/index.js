// 负责通过浏览器 Selection API 的段落边界策略生成长按翻译文本范围。
import { CHUNK_MIN_LENGTH } from "../../../shared/constants.js";
import { getVisibleRangeRects } from "../../highlight/rects.js";
import { getCaretRangeFromPoint } from "../shared/caret.js";
import {
    collapseRange,
    cloneSelectionRange,
    restoreSelectionRanges,
    snapshotSelectionRanges,
} from "../shared/selection.js";
import { containsPoint } from "../shared/text_nodes.js";

/**
 * 使用浏览器 Selection API 获取坐标处的原生段落范围。
 */
export function getNativeParagraphRangeFromPoint(x, y) {
    const caretRange = getCaretRangeFromPoint(x, y);
    if (!caretRange || !window.getSelection) return null;
    const selection = window.getSelection();
    if (typeof selection.modify !== "function") return null;
    const previousRanges = snapshotSelectionRanges(selection);
    let nativeRange = null;

    try {
        selection.removeAllRanges();
        selection.addRange(collapseRange(caretRange));
        selection.modify("move", "backward", "paragraphboundary");
        selection.modify("extend", "forward", "paragraphboundary");
        nativeRange = cloneSelectionRange(selection);
    } catch (error) {
        nativeRange = null;
    } finally {
        restoreSelectionRanges(selection, previousRanges);
    }

    return nativeRange && isReasonableLongPressRange(nativeRange, x, y) ? nativeRange : null;
}

/**
 * 判断原生段落范围是否有文本且覆盖长按坐标。
 */
function isReasonableLongPressRange(range, x, y) {
    const text = range.toString().trim();
    return (
        text.length >= Math.min(CHUNK_MIN_LENGTH, 2) &&
        getVisibleRangeRects(range).some((rect) => containsPoint(rect, x, y))
    );
}
