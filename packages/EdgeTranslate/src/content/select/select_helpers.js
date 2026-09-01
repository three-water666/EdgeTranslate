import { getDomain } from "common/scripts/common.js";
import { isPDFjsPDFViewer } from "../common.js";
import { DEFAULT_SETTINGS, getOrSetDefaultSettings } from "common/scripts/settings.js";

const AUTO_AVOID_POSITION = "AutoAvoid";
const AUTO_POSITION_ORDER = ["TopRight", "TopLeft", "BottomRight", "BottomLeft"];
const BUTTON_CLEARANCE = 4;
const COLLISION_SAMPLE_STEP = 8;
const EXTENSION_ELEMENT_SELECTOR =
    "#edge-translate-button, #edge-translate-button-host, #edge-translate-root, " +
    "#edge-translate-screenshot-overlay";

export function getSelection() {
    const selection = window.getSelection();
    let text = selection.toString().trim();
    let position;
    if (selection.rangeCount > 0 && isPDFjsPDFViewer()) text = text.replace(/\n/g, " ");
    if (selection.rangeCount > 0) {
        const lastRange = selection.getRangeAt(selection.rangeCount - 1);
        if (lastRange.endContainer !== document.documentElement) {
            const rect = lastRange.getBoundingClientRect();
            position = [rect.left, rect.top];
        }
    }
    return { text, position };
}

export function shouldTranslate() {
    const selectionObject = window.getSelection();
    const selectionText = selectionObject.toString().trim();
    const filterNode = (node) => node?.nodeType === Node.TEXT_NODE || node?.tagName === "BODY";
    return (
        selectionText.length > 0 &&
        (filterNode(selectionObject.anchorNode) || filterNode(selectionObject.focusNode)) &&
        !(window.isDisplayingResult && window.translateResult.originalText === selectionText)
    );
}

export function isInBlacklist() {
    return getOrSetDefaultSettings("blacklist", DEFAULT_SETTINGS).then((result) => {
        const url = window.location.href;
        return result.blacklist.domains[getDomain(url)] || result.blacklist.urls[url];
    });
}

export function cancelTextSelection() {
    const selection = window.getSelection?.();
    if (selection?.empty) return selection.empty();
    if (selection?.removeAllRanges) return selection.removeAllRanges();
    if (document.selection) document.selection.empty();
}

export function cancelPageTranslate() {
    clickIfPresent(
        document.getElementById(":0.container")?.contentDocument?.getElementById(":0.close")
    );
    clickIfPresent(
        document
            .getElementById("OUTFOX_JTR_BAR")
            ?.contentDocument?.getElementById("OUTFOX_JTR_BAR_CLOSE")
    );
}

export function getInnerParent(container) {
    if (container.tagName === "IFRAME") return container.contentDocument.body;
    if (!container.shadowRoot) container.attachShadow({ mode: "open" });
    return container.shadowRoot;
}

export function getButtonPosition(positionSetting, container, event) {
    if (positionSetting === AUTO_AVOID_POSITION) {
        return getAutoButtonPosition(container, event);
    }

    const offset = resolveButtonOffset(positionSetting, container);
    let left = event.x + offset.x;
    let top = event.y + offset.y;
    if (left <= 0 || left + container.clientWidth > window.innerWidth) {
        left = event.x - offset.x - container.clientWidth;
    }
    if (top <= 0 || top + container.clientHeight > window.innerHeight) {
        top = event.y - offset.y - container.clientHeight;
    }
    return { left, top };
}

function getAutoButtonPosition(container, event) {
    const candidates = AUTO_POSITION_ORDER.map((position) =>
        resolveButtonPosition(position, container, event)
    ).filter((position) => isPositionInViewport(position, container));
    const availableCandidates = candidates.length
        ? candidates
        : AUTO_POSITION_ORDER.map((position) =>
              clampButtonPosition(resolveButtonPosition(position, container, event), container)
          );
    const floatingElementCache = new Map();

    return measurePageWithoutButton(container, () =>
        availableCandidates.reduce((best, position) => {
            const score = getButtonCollisionScore(position, container, floatingElementCache);
            if (!best || score < best.score) return { position, score };
            return best;
        }, null)
    ).position;
}

function measurePageWithoutButton(container, measure) {
    const previousVisibility = container.style.getPropertyValue("visibility");
    const previousPriority = container.style.getPropertyPriority("visibility");
    container.style.setProperty("visibility", "hidden", "important");
    try {
        return measure();
    } finally {
        if (previousVisibility) {
            container.style.setProperty("visibility", previousVisibility, previousPriority);
        } else {
            container.style.removeProperty("visibility");
        }
    }
}

function resolveButtonPosition(position, container, event) {
    const offset = resolveButtonOffset(position, container);
    return { left: event.x + offset.x, top: event.y + offset.y };
}

function isPositionInViewport(position, container) {
    return (
        position.left >= 0 &&
        position.top >= 0 &&
        position.left + container.clientWidth <= window.innerWidth &&
        position.top + container.clientHeight <= window.innerHeight
    );
}

function clampButtonPosition(position, container) {
    return {
        left: Math.min(
            Math.max(position.left, 0),
            Math.max(window.innerWidth - container.clientWidth, 0)
        ),
        top: Math.min(
            Math.max(position.top, 0),
            Math.max(window.innerHeight - container.clientHeight, 0)
        ),
    };
}

function getButtonCollisionScore(position, container, floatingElementCache) {
    const candidateRect = {
        left: Math.max(position.left - BUTTON_CLEARANCE, 0),
        top: Math.max(position.top - BUTTON_CLEARANCE, 0),
        right: Math.min(
            position.left + container.clientWidth + BUTTON_CLEARANCE,
            window.innerWidth
        ),
        bottom: Math.min(
            position.top + container.clientHeight + BUTTON_CLEARANCE,
            window.innerHeight
        ),
    };
    const floatingElements = new Set();
    let sampledCollisionCount = 0;

    for (const x of getSamplePoints(candidateRect.left, candidateRect.right)) {
        for (const y of getSamplePoints(candidateRect.top, candidateRect.bottom)) {
            const elements = getFloatingPageElementsAtPoint(x, y, container, floatingElementCache);
            if (elements.length > 0) sampledCollisionCount += 1;
            for (const element of elements) floatingElements.add(element);
        }
    }

    const intersectionArea = Array.from(floatingElements).reduce(
        (area, element) =>
            area + getIntersectionArea(candidateRect, element.getBoundingClientRect()),
        0
    );
    return intersectionArea + sampledCollisionCount / 1000;
}

function getSamplePoints(start, end) {
    if (end <= start) return [];

    const points = [];
    for (let point = start + 0.5; point < end; point += COLLISION_SAMPLE_STEP) {
        points.push(point);
    }
    const finalPoint = end - 0.5;
    if (points.length === 0 || finalPoint - points[points.length - 1] > 1) points.push(finalPoint);
    return points;
}

function getFloatingPageElementsAtPoint(x, y, container, floatingElementCache) {
    const elements =
        typeof document.elementsFromPoint === "function"
            ? document.elementsFromPoint(x, y)
            : [document.elementFromPoint?.(x, y)].filter(Boolean);

    return elements
        .map((element) => getFloatingPageElement(element, container, floatingElementCache))
        .filter(Boolean);
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

function isExtensionElement(element, container) {
    if (element === container || container.contains?.(element)) return true;
    return Boolean(element.closest?.(EXTENSION_ELEMENT_SELECTOR));
}

function isFloatingElement(element) {
    if (matchesTopLayer(element)) return true;

    const style = window.getComputedStyle(element);
    const position = style.position || "static";
    if (isInvisibleElement(style)) return false;
    return hasFloatingPosition(position, style.zIndex);
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
        position === "absolute" ||
        (position !== "static" && zIndex !== "" && zIndex !== "auto")
    );
}

function matchesTopLayer(element) {
    try {
        return element.matches(":modal, :popover-open");
    } catch {
        return false;
    }
}

export function syncChangedSettings(state, changes, area, cancelLongPressSession) {
    if (area !== "sync") return;
    if (changes.LayoutSettings) {
        state.buttonPositionSetting = changes.LayoutSettings.newValue.SelectTranslatePosition;
    }
    if (changes.OtherSettings) {
        state.longPressEnabled = Boolean(changes.OtherSettings.newValue?.TranslateAfterLongPress);
        if (!state.longPressEnabled) cancelLongPressSession(state);
    }
}

export function applyButtonImageStyle(buttonImage) {
    const buttonSize = "20px";
    Object.assign(buttonImage.style, {
        width: buttonSize,
        height: buttonSize,
        minWidth: 0,
        maxWidth: buttonSize,
        minHeight: 0,
        maxHeight: buttonSize,
        padding: 0,
        border: 0,
        margin: 0,
        verticalAlign: 0,
        filter: "none",
    });
}

export function applyButtonStyle(translationButton) {
    const buttonSize = "20px";
    Object.assign(translationButton.style, {
        width: buttonSize,
        height: buttonSize,
        padding: "6px",
        margin: 0,
        borderRadius: "50%",
        boxSizing: "content-box",
        overflow: "hidden",
        border: "none",
        cursor: "pointer",
    });
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

function clickIfPresent(button) {
    if (button !== null && button !== undefined) button.click();
}
