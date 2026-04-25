export function getPageScrollTop() {
    const scrollingElement = document.scrollingElement || document.documentElement || document.body;
    return (
        window.pageYOffset ||
        scrollingElement?.scrollTop ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0
    );
}

export function getPageViewportHeight() {
    return (
        window.innerHeight ||
        document.documentElement.clientHeight ||
        document.body.clientHeight ||
        0
    );
}

export function isAutoClosePanelOnPageScrollEnabled(layoutSettings) {
    return layoutSettings?.AutoClosePanelOnPageScroll !== false;
}

export function shouldClosePanelOnPageScroll({
    enabled,
    open,
    contentType,
    startScrollTop,
    currentScrollTop,
    viewportHeight,
}) {
    return (
        enabled &&
        open &&
        isPanelResultContentVisible(contentType) &&
        Number.isFinite(startScrollTop) &&
        Number.isFinite(currentScrollTop) &&
        Number.isFinite(viewportHeight) &&
        viewportHeight > 0 &&
        Math.abs(currentScrollTop - startScrollTop) >= viewportHeight
    );
}

function isPanelResultContentVisible(contentType) {
    return contentType === "RESULT" || contentType === "ERROR";
}
