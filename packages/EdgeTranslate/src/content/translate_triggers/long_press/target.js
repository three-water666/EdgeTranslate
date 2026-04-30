/**
 * 判断长按起点是否应该被忽略，避免干扰输入控件和插件自身 UI。
 */
export function shouldIgnoreTarget(target) {
    if (!(target instanceof Element)) return true;
    if (
        target.closest(
            "#edge-translate-button, #edge-translate-root, #edge-translate-screenshot-overlay, input, textarea, select, button, [contenteditable=''], [contenteditable='true'], [role='slider'], [role='progressbar'], [role='scrollbar'], [role='tab']"
        )
    ) {
        return true;
    }

    const cursor = window.getComputedStyle(target).cursor;
    return /^(move|([nsweo]|[nwse]w|col|row)-resize|grab|grabbing)$/.test(cursor);
}

/**
 * 获取需要在长按翻译后临时拦截点击的交互目标。
 */
export function getActionTarget(target) {
    const element = target instanceof Element ? target : target?.parentElement;
    if (!element) return null;
    return element.closest("a, button, [role='button']") || element;
}
