/**
 * 判断长按起点是否应该被忽略，避免干扰输入控件和插件自身 UI。
 */
export function shouldIgnoreTarget(target) {
    if (!(target instanceof Element)) return true;
    if (
        target.closest(
            "#edge-translate-button, #edge-translate-button-host, #edge-translate-root, #edge-translate-screenshot-overlay, input, textarea, select, button, [contenteditable=''], [contenteditable='true'], [role='slider'], [role='progressbar'], [role='scrollbar'], [role='tab']"
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

/**
 * 获取文本范围中可见且有效的高亮矩形区域。
 */
export function getHighlightRects(range) {
    return Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0);
}

export function isSimpleDirectTextBlockContainer(
    element,
    { textLength, maxLength, isBlockContainerCandidate, getBlockTextLength }
) {
    return (
        element.tagName === "DIV" &&
        textLength >= 2 &&
        textLength <= maxLength &&
        !hasBlockTextChild(element, isBlockContainerCandidate, getBlockTextLength)
    );
}

export function isHiddenTextContainer(element) {
    for (
        let currentElement = element;
        currentElement && currentElement !== document.documentElement;
        currentElement = currentElement.parentElement
    ) {
        if (currentElement.hidden || currentElement.getAttribute("aria-hidden") === "true") {
            return true;
        }
        const style = window.getComputedStyle(currentElement);
        if (style.display === "none" || /^(hidden|collapse)$/.test(style.visibility)) {
            return true;
        }
    }
    return false;
}

function hasBlockTextChild(element, isBlockContainerCandidate, getBlockTextLength) {
    return Array.from(element.children).some(
        (child) => isBlockContainerCandidate(child) && getBlockTextLength(child) > 0
    );
}
