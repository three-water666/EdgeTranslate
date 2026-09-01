import { getButtonCollision } from "./select_button_collision.js";

const AUTO_AVOID_POSITION = "AutoAvoid";
const AUTO_POSITION_ORDER = ["TopRight", "BottomRight", "TopLeft", "BottomLeft"];
const BUTTON_GAP = 10;
const BUTTON_VIEWPORT_PADDING = 4;
const MAX_VIEWPORT_NUDGE = 12;
const BLOCKED_OVERLAP_RATIO = 0.25;

export function getButtonPosition(positionSetting, container, anchor) {
    const { left, top } = getButtonPlacement(positionSetting, container, anchor);
    return { left, top };
}

export function getButtonPlacement(positionSetting, container, anchor, options = {}) {
    if (positionSetting === AUTO_AVOID_POSITION) {
        return getAutoButtonPlacement(container, anchor, options);
    }

    const offset = resolveButtonOffset(positionSetting, container);
    let left = anchor.x + offset.x;
    let top = anchor.y + offset.y;
    if (left <= 0 || left + container.clientWidth > window.innerWidth) {
        left = anchor.x - offset.x - container.clientWidth;
    }
    if (top <= 0 || top + container.clientHeight > window.innerHeight) {
        top = anchor.y - offset.y - container.clientHeight;
    }
    return { direction: positionSetting, left, top };
}

function getAutoButtonPlacement(container, anchor, options) {
    const candidates = AUTO_POSITION_ORDER.map((direction) =>
        createButtonCandidate(direction, container, anchor)
    );
    const floatingElementCache = new Map();

    return measureCandidatesWithButton(container, () => {
        const evaluatedCandidates = candidates.map((candidate) =>
            evaluateCandidate(candidate, container, floatingElementCache)
        );
        const currentCandidate = evaluatedCandidates.find(
            (candidate) => candidate.direction === options.currentDirection
        );
        if (currentCandidate?.usable) return toButtonPlacement(currentCandidate);

        const orderedCandidates = orderCandidatesAfterCurrent(
            evaluatedCandidates,
            options.currentDirection
        );
        const usableCandidate = orderedCandidates.find((candidate) => candidate.usable);
        if (usableCandidate) return toButtonPlacement(usableCandidate);

        const leastObstructedCandidate = getLeastObstructedCandidate(evaluatedCandidates);
        if (
            currentCandidate &&
            !isMeaningfullyBetterCandidate(leastObstructedCandidate, currentCandidate)
        ) {
            return toButtonPlacement(currentCandidate);
        }
        return toButtonPlacement(leastObstructedCandidate);
    });
}

function evaluateCandidate(candidate, container, floatingElementCache) {
    setButtonPositionForMeasurement(container, candidate);
    const collision = getButtonCollision(candidate, container, floatingElementCache);
    return {
        ...candidate,
        collision,
        usable: candidate.viewportUsable && !candidate.overlapsSelection && !collision.blocked,
    };
}

function createButtonCandidate(direction, container, anchor) {
    const rawPosition = resolveButtonPosition(direction, container, anchor);
    const position = nudgeButtonIntoViewport(rawPosition, container);
    const buttonRect = getButtonRect(position, container);
    const buttonArea = Math.max(container.clientWidth * container.clientHeight, 1);
    const selectionOverlapArea = anchor.selectionRect
        ? getIntersectionArea(buttonRect, anchor.selectionRect)
        : 0;
    const nudgeDistance = Math.max(
        Math.abs(position.left - rawPosition.left),
        Math.abs(position.top - rawPosition.top)
    );

    return {
        direction,
        left: position.left,
        nudgeDistance,
        overlapsSelection: selectionOverlapArea / buttonArea >= BLOCKED_OVERLAP_RATIO,
        top: position.top,
        viewportUsable:
            nudgeDistance <= MAX_VIEWPORT_NUDGE && isPositionInViewport(position, container),
    };
}

function measureCandidatesWithButton(container, measure) {
    const properties = ["left", "opacity", "top"];
    const previousStyles = properties.map((property) => ({
        property,
        priority: container.style.getPropertyPriority(property),
        value: container.style.getPropertyValue(property),
    }));
    container.style.setProperty("opacity", "0", "important");
    try {
        return measure();
    } finally {
        restoreStyles(container, previousStyles);
    }
}

function restoreStyles(container, styles) {
    for (const { priority, property, value } of styles) {
        if (value) container.style.setProperty(property, value, priority);
        else container.style.removeProperty(property);
    }
}

function setButtonPositionForMeasurement(container, position) {
    container.style.left = `${position.left}px`;
    container.style.top = `${position.top}px`;
}

function resolveButtonPosition(direction, container, anchor) {
    if (!anchor.selectionRect) {
        const offset = resolveButtonOffset(direction, container);
        return { left: anchor.x + offset.x, top: anchor.y + offset.y };
    }

    return resolveSelectionButtonPosition(direction, container, anchor.selectionRect);
}

function resolveSelectionButtonPosition(direction, container, rect) {
    switch (direction) {
        case "TopLeft":
            return {
                left: rect.left - BUTTON_GAP - container.clientWidth,
                top: rect.top - BUTTON_GAP - container.clientHeight,
            };
        case "BottomRight":
            return { left: rect.right + BUTTON_GAP, top: rect.bottom + BUTTON_GAP };
        case "BottomLeft":
            return {
                left: rect.left - BUTTON_GAP - container.clientWidth,
                top: rect.bottom + BUTTON_GAP,
            };
        case "TopRight":
        default:
            return {
                left: rect.right + BUTTON_GAP,
                top: rect.top - BUTTON_GAP - container.clientHeight,
            };
    }
}

function isPositionInViewport(position, container) {
    return (
        position.left >= 0 &&
        position.top >= 0 &&
        position.left + container.clientWidth <= window.innerWidth &&
        position.top + container.clientHeight <= window.innerHeight
    );
}

function nudgeButtonIntoViewport(position, container) {
    const maximumLeft = Math.max(
        window.innerWidth - container.clientWidth - BUTTON_VIEWPORT_PADDING,
        BUTTON_VIEWPORT_PADDING
    );
    const maximumTop = Math.max(
        window.innerHeight - container.clientHeight - BUTTON_VIEWPORT_PADDING,
        BUTTON_VIEWPORT_PADDING
    );
    return {
        left: Math.min(Math.max(position.left, BUTTON_VIEWPORT_PADDING), maximumLeft),
        top: Math.min(Math.max(position.top, BUTTON_VIEWPORT_PADDING), maximumTop),
    };
}

function getButtonRect(position, container) {
    return {
        bottom: position.top + container.clientHeight,
        left: position.left,
        right: position.left + container.clientWidth,
        top: position.top,
    };
}

function getIntersectionArea(firstRect, secondRect) {
    const width = Math.max(
        0,
        Math.min(firstRect.right, secondRect.right) - Math.max(firstRect.left, secondRect.left)
    );
    const height = Math.max(
        0,
        Math.min(firstRect.bottom, secondRect.bottom) - Math.max(firstRect.top, secondRect.top)
    );
    return width * height;
}

function orderCandidatesAfterCurrent(candidates, currentDirection) {
    const currentIndex = candidates.findIndex(
        (candidate) => candidate.direction === currentDirection
    );
    if (currentIndex < 0) return candidates;
    return candidates.slice(currentIndex + 1).concat(candidates.slice(0, currentIndex + 1));
}

function getLeastObstructedCandidate(candidates) {
    return candidates.reduce((best, candidate) => {
        if (!best || getCandidatePenalty(candidate) < getCandidatePenalty(best)) return candidate;
        return best;
    }, null);
}

function isMeaningfullyBetterCandidate(candidate, currentCandidate) {
    return getCandidateSeverity(candidate) < getCandidateSeverity(currentCandidate);
}

function getCandidateSeverity(candidate) {
    if (candidate.collision.hardBlocked) return 4;
    if (!candidate.viewportUsable) return 3;
    if (candidate.overlapsSelection) return 2;
    if (candidate.collision.softBlocked) return 1;
    return 0;
}

function getCandidatePenalty(candidate) {
    return (
        Number(candidate.collision.centerOccluded) * 1000000 +
        candidate.collision.occludedSampleCount * 100000 +
        Number(candidate.collision.centerOverlapped) * 50000 +
        candidate.collision.overlapRatio * 10000 +
        Number(candidate.overlapsSelection) * 1000 +
        candidate.nudgeDistance
    );
}

function toButtonPlacement(candidate) {
    return {
        direction: candidate.direction,
        left: candidate.left,
        top: candidate.top,
    };
}

function resolveButtonOffset(position, container) {
    const offsetX = 10;
    const offsetY = 20;
    switch (position) {
        case "TopLeft":
            return { x: -offsetX - container.clientWidth, y: -offsetY - container.clientHeight };
        case "BottomRight":
            return { x: offsetX, y: offsetY };
        case "BottomLeft":
            return { x: -offsetX - container.clientWidth, y: offsetY };
        case "TopRight":
        default:
            return { x: offsetX, y: -offsetY - container.clientHeight };
    }
}
