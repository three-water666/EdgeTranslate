// 负责判断长按起点是否应忽略，并定位需要拦截点击的交互目标。
const IGNORED_TARGET_SELECTOR =
    "#edge-translate-button, #edge-translate-root, #edge-translate-screenshot-overlay, input, textarea, select, button, [contenteditable=''], [contenteditable='true'], [role='slider'], [role='progressbar'], [role='scrollbar'], [role='tab']";

const SCROLLABLE_OVERFLOW_VALUES = new Set(["auto", "scroll", "overlay"]);

/**
 * 判断长按起点是否应该被忽略，避免干扰输入控件和插件自身 UI。
 */
export function shouldIgnoreTarget(target, event) {
    if (!(target instanceof Element)) return true;
    if (target.closest(IGNORED_TARGET_SELECTOR)) return true;
    if (isPointerOnNativeScrollbar(target, event)) return true;

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

function isPointerOnNativeScrollbar(target, event) {
    if (!hasClientPoint(event)) return false;
    return getEventPathElements(target, event).some((element) =>
        isPointOnElementNativeScrollbar(element, event.clientX, event.clientY)
    );
}

function hasClientPoint(event) {
    return Number.isFinite(event?.clientX) && Number.isFinite(event?.clientY);
}

function getEventPathElements(target, event) {
    const path = typeof event.composedPath === "function" ? event.composedPath() : [];
    const pathElements = path.filter((item) => item instanceof Element);
    if (pathElements.length) return pathElements;

    const elements = [];
    for (let element = target; element; element = element.parentElement) {
        elements.push(element);
    }
    return elements;
}

function isPointOnElementNativeScrollbar(element, clientX, clientY) {
    if (!(element instanceof HTMLElement)) return false;
    if (element === document.documentElement || element === document.body) return false;

    const rect = element.getBoundingClientRect();
    if (!isPointInsideRect(clientX, clientY, rect)) return false;

    const style = window.getComputedStyle(element);
    const border = getBorderWidths(style);
    const verticalScrollbarWidth = getVerticalScrollbarWidth(element, border);
    const horizontalScrollbarHeight = getHorizontalScrollbarHeight(element, border);
    const context = {
        border,
        clientX,
        clientY,
        element,
        rect,
        style,
    };

    return (
        isPointOnHorizontalScrollbar(context, horizontalScrollbarHeight) ||
        isPointOnVerticalScrollbar(context, verticalScrollbarWidth)
    );
}

function isPointInsideRect(clientX, clientY, rect) {
    return (
        rect.width > 0 &&
        rect.height > 0 &&
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
    );
}

function getBorderWidths(style) {
    return {
        bottom: parseCssPixel(style.borderBottomWidth),
        left: parseCssPixel(style.borderLeftWidth),
        right: parseCssPixel(style.borderRightWidth),
        top: parseCssPixel(style.borderTopWidth),
    };
}

function parseCssPixel(value) {
    return Number.parseFloat(value) || 0;
}

function getVerticalScrollbarWidth(element, border) {
    return Math.max(0, element.offsetWidth - element.clientWidth - border.left - border.right);
}

function getHorizontalScrollbarHeight(element, border) {
    return Math.max(0, element.offsetHeight - element.clientHeight - border.top - border.bottom);
}

function isPointOnHorizontalScrollbar(context, scrollbarHeight) {
    const { border, clientX, clientY, element, rect, style } = context;
    if (!hasVisibleScrollbar(style.overflowX, element.scrollWidth, element.clientWidth)) {
        return false;
    }
    if (scrollbarHeight <= 0) return false;

    return (
        clientX >= rect.left + border.left &&
        clientX <= rect.right - border.right &&
        clientY >= rect.bottom - border.bottom - scrollbarHeight &&
        clientY <= rect.bottom - border.bottom
    );
}

function isPointOnVerticalScrollbar(context, scrollbarWidth) {
    const { border, clientX, clientY, element, rect, style } = context;
    if (!hasVisibleScrollbar(style.overflowY, element.scrollHeight, element.clientHeight)) {
        return false;
    }
    if (scrollbarWidth <= 0) return false;

    return (
        clientX >= rect.right - border.right - scrollbarWidth &&
        clientX <= rect.right - border.right &&
        clientY >= rect.top + border.top &&
        clientY <= rect.bottom - border.bottom
    );
}

function hasVisibleScrollbar(overflowValue, scrollSize, clientSize) {
    return (
        SCROLLABLE_OVERFLOW_VALUES.has(overflowValue) &&
        (overflowValue === "scroll" || scrollSize > clientSize)
    );
}
