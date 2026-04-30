// 负责从文本 Range 中提取可用于高亮和命中判断的可见矩形。
/**
 * 获取文本范围中可见且有效的矩形区域。
 */
export function getVisibleRangeRects(range) {
    return Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0);
}
