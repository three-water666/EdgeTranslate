/**
 * 判断鼠标是否按在元素原生滚动条上。原生滚动条不会出现在 DOM 中，事件目标仍是
 * 滚动容器本身，所以需要用坐标和 client area 排除。
 */
export function isInNativeScrollbar(event) {
    if (!(event?.target instanceof Element)) return false;
    if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return false;
    return getEventPathElements(event).some((element) =>
        isPointInNativeScrollbar(element, event.clientX, event.clientY)
    );
}

function getEventPathElements(event) {
    const path = event.composedPath?.() || [];
    if (path.length) return path.filter((node) => node instanceof Element);

    const elements = [];
    for (
        let element = event.target instanceof Element ? event.target : null;
        element;
        element = element.parentElement
    ) {
        elements.push(element);
    }
    return elements;
}

function isPointInNativeScrollbar(element, x, y) {
    if (!canElementHaveOwnNativeScrollbar(element)) return false;

    const metrics = getElementScrollbarMetrics(element);
    if (!containsPoint(metrics.borderBox, x, y)) return false;

    return (
        isInHorizontalScrollbar(metrics, x, y) ||
        isInRightVerticalScrollbar(metrics, x, y) ||
        isInLeftVerticalScrollbar(metrics, x, y)
    );
}

function getElementScrollbarMetrics(element) {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    const borders = {
        left: parseCssPixels(style.borderLeftWidth),
        top: parseCssPixels(style.borderTopWidth),
        right: parseCssPixels(style.borderRightWidth),
        bottom: parseCssPixels(style.borderBottomWidth),
    };
    const clientArea = {
        left: rect.left + element.clientLeft,
        top: rect.top + element.clientTop,
        right: rect.left + element.clientLeft + element.clientWidth,
        bottom: rect.top + element.clientTop + element.clientHeight,
    };
    const paddingBox = {
        left: rect.left + borders.left,
        top: rect.top + borders.top,
        right: rect.right - borders.right,
        bottom: rect.bottom - borders.bottom,
    };

    return {
        borderBox: rect,
        clientArea,
        element,
        hasHorizontal: hasNativeHorizontalScrollbar(element, style, rect, borders),
        hasVertical: hasNativeVerticalScrollbar(element, style, rect, borders),
        leftScrollbarWidth: Math.max(0, element.clientLeft - borders.left),
        paddingBox,
    };
}

function canElementHaveOwnNativeScrollbar(element) {
    return (
        element !== document.documentElement &&
        element !== document.body &&
        Number.isFinite(element.clientWidth) &&
        Number.isFinite(element.clientHeight) &&
        typeof element.getBoundingClientRect === "function"
    );
}

function isInHorizontalScrollbar(metrics, x, y) {
    return (
        metrics.hasHorizontal &&
        y >= metrics.clientArea.bottom &&
        y <= metrics.paddingBox.bottom &&
        x >= metrics.clientArea.left &&
        x <= metrics.paddingBox.right
    );
}

function isInRightVerticalScrollbar(metrics, x, y) {
    return (
        metrics.hasVertical &&
        x >= metrics.clientArea.right &&
        x <= metrics.paddingBox.right &&
        y >= metrics.clientArea.top &&
        y <= metrics.paddingBox.bottom
    );
}

function isInLeftVerticalScrollbar(metrics, x, y) {
    return (
        metrics.hasVertical &&
        metrics.leftScrollbarWidth > 0 &&
        x >= metrics.paddingBox.left &&
        x <= metrics.clientArea.left &&
        y >= metrics.clientArea.top &&
        y <= metrics.paddingBox.bottom
    );
}

function hasNativeHorizontalScrollbar(element, style, rect, borders) {
    return (
        canShowNativeScrollbar(style.overflowX) &&
        rect.height - element.clientHeight - borders.top - borders.bottom > 0 &&
        (style.overflowX === "scroll" || element.scrollWidth > element.clientWidth)
    );
}

function hasNativeVerticalScrollbar(element, style, rect, borders) {
    return (
        canShowNativeScrollbar(style.overflowY) &&
        rect.width - element.clientWidth - borders.left - borders.right > 0 &&
        (style.overflowY === "scroll" || element.scrollHeight > element.clientHeight)
    );
}

function canShowNativeScrollbar(overflow) {
    return /^(auto|scroll|overlay)$/.test(overflow);
}

function containsPoint(rect, x, y) {
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function parseCssPixels(value) {
    const number = Number.parseFloat(value);
    return Number.isFinite(number) ? number : 0;
}
