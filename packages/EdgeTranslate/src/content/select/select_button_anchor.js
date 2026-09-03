export function getButtonAnchor(event) {
    const point = getEventPoint(event);
    const selectionRect = getSelectionRectNearestPoint(point);
    return { ...point, selectionRect };
}

function getEventPoint(event) {
    const x = Number(event?.clientX ?? event?.x);
    const y = Number(event?.clientY ?? event?.y);
    return {
        x: Number.isFinite(x) ? x : 0,
        y: Number.isFinite(y) ? y : 0,
    };
}

function getSelectionRectNearestPoint(point) {
    const selection = window.getSelection?.();
    if (!selection?.rangeCount) return null;

    const range = selection.getRangeAt(selection.rangeCount - 1);
    const clientRects = getValidClientRects(range);
    if (clientRects.length === 0) return null;

    return clientRects.reduce((nearest, rect) => {
        const distance = getPointDistanceToRect(point, rect);
        if (!nearest || distance < nearest.distance) return { distance, rect };
        return nearest;
    }, null).rect;
}

function getValidClientRects(range) {
    let rects = [];
    try {
        rects = Array.from(range.getClientRects?.() || []);
        if (rects.length === 0) rects = [range.getBoundingClientRect?.()].filter(Boolean);
    } catch {
        return [];
    }

    return rects
        .map((rect) => ({
            bottom: Number(rect.bottom),
            left: Number(rect.left),
            right: Number(rect.right),
            top: Number(rect.top),
        }))
        .filter(isValidRect);
}

function isValidRect(rect) {
    return (
        Object.values(rect).every(Number.isFinite) &&
        rect.right > rect.left &&
        rect.bottom > rect.top
    );
}

function getPointDistanceToRect(point, rect) {
    const distanceX = Math.max(rect.left - point.x, 0, point.x - rect.right);
    const distanceY = Math.max(rect.top - point.y, 0, point.y - rect.bottom);
    return distanceX * distanceX + distanceY * distanceY;
}
