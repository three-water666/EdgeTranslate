// 负责保存、恢复和克隆页面 Selection 范围，避免临时取词破坏原选区。
/**
 * 保存当前页面选区范围，便于临时操作后恢复。
 */
export function snapshotSelectionRanges(selection) {
    const ranges = [];
    for (let i = 0; i < selection.rangeCount; i++) {
        ranges.push(selection.getRangeAt(i).cloneRange());
    }
    return ranges;
}

/**
 * 恢复之前保存的页面选区范围。
 */
export function restoreSelectionRanges(selection, ranges) {
    selection.removeAllRanges();
    ranges.forEach((range) => selection.addRange(range));
}

/**
 * 克隆文本范围并折叠到起点。
 */
export function collapseRange(range) {
    const collapsed = range.cloneRange();
    collapsed.collapse(true);
    return collapsed;
}

/**
 * 克隆当前选区的第一个非折叠范围。
 */
export function cloneSelectionRange(selection) {
    if (!selection.rangeCount) return null;
    const result = selection.getRangeAt(0).cloneRange();
    return result.collapsed ? null : result;
}
