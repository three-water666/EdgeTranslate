const BLOCKED_OVERLAP_RATIO = 0.25;
const BLOCKED_SAMPLE_COUNT = 3;
const COLLISION_SAMPLE_RATIOS = [0.2, 0.5, 0.8];
const MAX_GEOMETRIC_OVERLAY_VIEWPORT_RATIO = 0.25;
const EXTENSION_ELEMENT_SELECTOR =
    "#edge-translate-button, #edge-translate-button-host, #edge-translate-root, " +
    "#edge-translate-screenshot-overlay";

export function getButtonCollision(position, container, floatingElementCache) {
    const candidateRect = getButtonRect(position, container);
    const stats = createCollisionStats();

    for (const xRatio of COLLISION_SAMPLE_RATIOS) {
        for (const yRatio of COLLISION_SAMPLE_RATIOS) {
            collectCollisionSample(stats, {
                candidateRect,
                container,
                floatingElementCache,
                xRatio,
                yRatio,
            });
        }
    }

    const overlapArea = getUnionIntersectionArea(
        candidateRect,
        Array.from(stats.floatingElements, (element) => element.getBoundingClientRect())
    );
    const buttonArea = Math.max(container.clientWidth * container.clientHeight, 1);
    const overlapRatio = overlapArea / buttonArea;
    const hardBlocked = stats.centerOccluded || stats.occludedSampleCount >= BLOCKED_SAMPLE_COUNT;
    const softBlocked =
        stats.centerOverlapped ||
        stats.overlappingSampleCount >= BLOCKED_SAMPLE_COUNT ||
        overlapRatio >= BLOCKED_OVERLAP_RATIO;
    return {
        blocked: hardBlocked || softBlocked,
        hardBlocked,
        overlapRatio,
        softBlocked,
        ...stats,
    };
}

function createCollisionStats() {
    return {
        centerOccluded: false,
        centerOverlapped: false,
        floatingElements: new Set(),
        occludedSampleCount: 0,
        overlappingSampleCount: 0,
    };
}

function collectCollisionSample(
    stats,
    { candidateRect, container, floatingElementCache, xRatio, yRatio }
) {
    const x = candidateRect.left + container.clientWidth * xRatio;
    const y = candidateRect.top + container.clientHeight * yRatio;
    const collision = getCollisionAtPoint(x, y, container, floatingElementCache);
    const isCenter = xRatio === 0.5 && yRatio === 0.5;

    if (collision.floatingElements.length > 0) stats.overlappingSampleCount += 1;
    if (collision.occludingElements.length > 0) stats.occludedSampleCount += 1;
    if (isCenter) {
        stats.centerOverlapped = collision.floatingElements.length > 0;
        stats.centerOccluded = collision.occludingElements.length > 0;
    }
    for (const element of collision.floatingElements) stats.floatingElements.add(element);
}

function getButtonRect(position, container) {
    return {
        bottom: position.top + container.clientHeight,
        left: position.left,
        right: position.left + container.clientWidth,
        top: position.top,
    };
}

function getCollisionAtPoint(x, y, container, floatingElementCache) {
    const elements =
        typeof document.elementsFromPoint === "function"
            ? document.elementsFromPoint(x, y)
            : [document.elementFromPoint?.(x, y)].filter(Boolean);
    const extensionIndex = elements.findIndex((element) => isExtensionElement(element, container));
    const floatingElements = [];
    const occludingElements = [];

    for (const [index, element] of elements.entries()) {
        if (!(element instanceof Element) || isExtensionElement(element, container)) continue;
        const floatingElement = getFloatingPageElement(element, container, floatingElementCache);
        if (floatingElement) floatingElements.push(floatingElement);
        if (extensionIndex >= 0 && index < extensionIndex) {
            occludingElements.push(floatingElement || element);
        }
    }
    return { floatingElements, occludingElements };
}

function getFloatingPageElement(element, container, floatingElementCache) {
    if (!(element instanceof Element) || isExtensionElement(element, container)) return null;

    for (let current = element; current; current = current.parentElement) {
        if (isExtensionElement(current, container)) return null;
        if (!floatingElementCache.has(current)) {
            floatingElementCache.set(current, isFloatingElement(current));
        }
        if (floatingElementCache.get(current)) return current;
    }
    return null;
}

function getUnionIntersectionArea(candidateRect, rectangles) {
    const intersections = getIntersectionRects(candidateRect, rectangles);
    const xCoordinates = Array.from(
        new Set(intersections.flatMap((rect) => [rect.left, rect.right]))
    ).sort((first, second) => first - second);
    let area = 0;

    for (let index = 0; index < xCoordinates.length - 1; index += 1) {
        const left = xCoordinates[index];
        const right = xCoordinates[index + 1];
        area += (right - left) * getCoveredHeight(intersections, left, right);
    }
    return area;
}

function getIntersectionRects(candidateRect, rectangles) {
    return rectangles
        .map((rect) => ({
            bottom: Math.min(candidateRect.bottom, rect.bottom),
            left: Math.max(candidateRect.left, rect.left),
            right: Math.min(candidateRect.right, rect.right),
            top: Math.max(candidateRect.top, rect.top),
        }))
        .filter((rect) => rect.right > rect.left && rect.bottom > rect.top);
}

function getCoveredHeight(rectangles, left, right) {
    const intervals = rectangles
        .filter((rect) => rect.left < right && rect.right > left)
        .map((rect) => [rect.top, rect.bottom])
        .sort((first, second) => first[0] - second[0]);
    let coveredHeight = 0;
    let currentInterval = null;

    for (const interval of intervals) {
        if (!currentInterval || interval[0] > currentInterval[1]) {
            if (currentInterval) coveredHeight += currentInterval[1] - currentInterval[0];
            currentInterval = [...interval];
        } else {
            currentInterval[1] = Math.max(currentInterval[1], interval[1]);
        }
    }
    if (currentInterval) coveredHeight += currentInterval[1] - currentInterval[0];
    return coveredHeight;
}

function isExtensionElement(element, container) {
    if (element === container || container.contains?.(element)) return true;
    return Boolean(element.closest?.(EXTENSION_ELEMENT_SELECTOR));
}

function isFloatingElement(element) {
    if (matchesTopLayer(element)) return true;

    const style = window.getComputedStyle(element);
    const position = style.position || "static";
    if (isInvisibleElement(style)) return false;
    if (!hasFloatingPosition(position, style.zIndex)) return false;
    return !isLargeLayoutElement(element);
}

function isInvisibleElement(style) {
    return (
        style.display === "none" ||
        style.visibility === "hidden" ||
        (style.opacity !== "" && Number(style.opacity) === 0)
    );
}

function hasFloatingPosition(position, zIndex) {
    return (
        position === "fixed" ||
        position === "sticky" ||
        (position === "absolute" && zIndex !== "" && zIndex !== "auto")
    );
}

function isLargeLayoutElement(element) {
    const rect = element.getBoundingClientRect();
    const width = Math.max(Number(rect.width) || rect.right - rect.left, 0);
    const height = Math.max(Number(rect.height) || rect.bottom - rect.top, 0);
    const viewportArea = Math.max(window.innerWidth * window.innerHeight, 1);
    return width * height >= viewportArea * MAX_GEOMETRIC_OVERLAY_VIEWPORT_RATIO;
}

function matchesTopLayer(element) {
    try {
        return element.matches(":modal, :popover-open");
    } catch {
        return false;
    }
}
