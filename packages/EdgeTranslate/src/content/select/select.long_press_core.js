import {
    SENTENCE_BOUNDARY_REGEXP,
    SENTENCE_TRAILING_REGEXP,
    CHUNK_TARGET_LENGTH,
    CHUNK_MAX_LENGTH,
    CHUNK_MIN_LENGTH,
    DIRECT_TEXT_BLOCK_TAG_REGEXP,
} from "./select.constants.js";
import { scoreContainer, isReasonableBlockContainer } from "./select.long_press_score.js";
import {
    collectBlockCandidates,
    pickBestBlockContainer,
    buildTextEntries,
    expandChunkWindow,
    normalizeChunkBounds,
    normalizeOffset,
    pickVisibleCharacter,
    scanNearestVisibleCharacter,
    advanceTrailingBoundary,
    pushSegment,
    locateTextPosition,
    snapshotSelectionRanges,
    restoreSelectionRanges,
    collapseRange,
    cloneSelectionRange,
} from "./select.long_press_utils.js";

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

export function getActionTarget(target) {
    const element = target instanceof Element ? target : target?.parentElement;
    if (!element) return null;
    return element.closest("a, button, [role='button']") || element;
}

export function getLongPressRangeFromPoint(x, y) {
    return getBlockRangeFromPoint(x, y) || getNativeOrChunkRange(x, y);
}

export function getHighlightRects(range) {
    return Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0);
}

function getNativeOrChunkRange(x, y) {
    const nativeRange = getNativeParagraphRangeFromPoint(x, y);
    if (nativeRange && isReasonableLongPressRange(nativeRange, x, y)) return nativeRange;
    return getChunkRangeFromPoint(x, y);
}

function getBlockRangeFromPoint(x, y) {
    const caretRange = getCaretRangeFromPoint(x, y);
    if (!caretRange) return null;
    const textNode = resolveTargetTextNode(caretRange, x, y);
    if (!textNode || !textNode.textContent?.trim()) return null;
    const container = getPreferredBlockContainer(textNode, x, y);
    const textNodes = collectTextNodes(container);
    if (!textNodes.length) return null;
    const range = document.createRange();
    range.setStart(textNodes[0], 0);
    range.setEnd(
        textNodes[textNodes.length - 1],
        textNodes[textNodes.length - 1].textContent.length
    );
    return range.toString().trim() ? range : null;
}

function getPreferredBlockContainer(textNode, x, y) {
    const directContainer = getDirectTextBlockContainer(textNode);
    if (directContainer) return directContainer;
    const candidates = [
        getSentenceContainer(textNode),
        ...collectBlockCandidates(textNode, isTraversableElement, isBlockContainerCandidate),
    ];
    return pickBestBlockContainer(candidates, x, y, (element, clientX, clientY) =>
        scoreContainer({
            element,
            x: clientX,
            y: clientY,
            collectTextNodes,
            containsPoint,
        })
    );
}

function getDirectTextBlockContainer(textNode) {
    let currentElement = textNode.parentElement;
    while (isTraversableElement(currentElement)) {
        if (
            DIRECT_TEXT_BLOCK_TAG_REGEXP.test(currentElement.tagName) &&
            isReasonableBlockContainer(currentElement)
        ) {
            return currentElement;
        }
        currentElement = currentElement.parentElement;
    }
    return null;
}

function getNativeParagraphRangeFromPoint(x, y) {
    const caretRange = getCaretRangeFromPoint(x, y);
    if (!caretRange || !window.getSelection) return null;
    const selection = window.getSelection();
    if (typeof selection.modify !== "function") return null;
    const previousRanges = snapshotSelectionRanges(selection);

    try {
        selection.removeAllRanges();
        selection.addRange(collapseRange(caretRange));
        selection.modify("move", "backward", "paragraphboundary");
        selection.modify("extend", "forward", "paragraphboundary");
        return cloneSelectionRange(selection);
    } catch (error) {
        return null;
    } finally {
        restoreSelectionRanges(selection, previousRanges);
    }
}

function getChunkRangeFromPoint(x, y) {
    const caretRange = getCaretRangeFromPoint(x, y);
    if (!caretRange) return null;
    const textNode = resolveTargetTextNode(caretRange, x, y);
    if (!textNode || !textNode.textContent?.trim()) return null;
    const chunkContext = getChunkContext(textNode, caretRange.startOffset);
    if (!chunkContext) return null;
    const range = document.createRange();
    range.setStart(chunkContext.start.node, chunkContext.start.offset);
    range.setEnd(chunkContext.end.node, chunkContext.end.offset);
    return range;
}

function getChunkContext(textNode, rawOffset) {
    const textNodes = collectTextNodes(getSentenceContainer(textNode));
    if (!textNodes.length) return null;
    const entries = buildTextEntries(textNodes);
    const entry = entries.items.find((item) => item.node === textNode);
    if (!entry) return null;
    const globalOffset = resolveSentenceOffset(entries.fullText, entry.start + rawOffset);
    if (globalOffset === null) return null;
    const bounds = getChunkBounds(entries.fullText, globalOffset);
    if (!bounds || bounds.start >= bounds.end) return null;
    return {
        start: locateTextPosition(entries.items, bounds.start),
        end: locateTextPosition(entries.items, bounds.end),
    };
}

function getChunkBounds(text, offset) {
    const segments = splitIntoSentenceSegments(text);
    const currentIndex = segments.findIndex(
        (segment) => offset >= segment.start && offset < segment.end
    );
    if (currentIndex === -1) return null;
    const expanded = expandChunkWindow(
        segments,
        currentIndex,
        CHUNK_TARGET_LENGTH,
        CHUNK_MAX_LENGTH
    );
    const bounds = normalizeChunkBounds({
        text,
        segments,
        currentIndex,
        expanded,
        limits: {
            maxLength: CHUNK_MAX_LENGTH,
            minLength: CHUNK_MIN_LENGTH,
        },
    });
    return bounds.start < bounds.end ? bounds : null;
}

function resolveSentenceOffset(text, rawOffset) {
    if (!text?.length) return null;
    const offset = normalizeOffset(text, rawOffset);
    return (
        pickVisibleCharacter(text, [offset, offset - 1]) ??
        scanNearestVisibleCharacter(text, offset, pickVisibleCharacter)
    );
}

function splitIntoSentenceSegments(text) {
    const segments = [];
    let segmentStart = 0;
    for (let i = 0; i < text.length; i++) {
        if (!SENTENCE_BOUNDARY_REGEXP.test(text[i])) continue;
        const segmentEnd = advanceTrailingBoundary(text, i + 1, SENTENCE_TRAILING_REGEXP);
        pushSegment(segments, text, segmentStart, segmentEnd);
        segmentStart = segmentEnd;
    }
    pushSegment(segments, text, segmentStart, text.length);
    return segments;
}

function getSentenceContainer(textNode) {
    let element = textNode.parentElement;
    while (isTraversableElement(element)) {
        if (isBlockContainerCandidate(element)) return element;
        element = element.parentElement;
    }
    return textNode.parentElement || document.body;
}

function collectTextNodes(rootNode) {
    if (!rootNode) return [];
    const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT, {
        acceptNode(textNode) {
            if (!textNode.textContent?.trim()) return NodeFilter.FILTER_REJECT;
            if (shouldIgnoreTarget(textNode.parentElement)) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
        },
    });
    const textNodes = [];
    for (let node = walker.nextNode(); node; node = walker.nextNode()) textNodes.push(node);
    return textNodes;
}

function resolveTargetTextNode(caretRange, x, y) {
    return caretRange.startContainer.nodeType === Node.TEXT_NODE
        ? caretRange.startContainer
        : getNearestTextNode(caretRange.startContainer, x, y, caretRange.startOffset);
}

function getCaretRangeFromPoint(x, y) {
    if (document.caretRangeFromPoint) return document.caretRangeFromPoint(x, y);
    if (!document.caretPositionFromPoint) return null;
    const caretPosition = document.caretPositionFromPoint(x, y);
    if (!caretPosition) return null;
    const range = document.createRange();
    range.setStart(caretPosition.offsetNode, caretPosition.offset);
    range.collapse(true);
    return range;
}

function getNearestTextNode(node, x, y, offset = 0) {
    if (!node) return null;
    if (node.nodeType === Node.TEXT_NODE) return node;
    const childNodes = Array.from(node.childNodes || []);
    const candidateNode = childNodes[Math.max(0, Math.min(offset, childNodes.length - 1))];
    const directTextNode = findTextNode(candidateNode);
    if (directTextNode) return directTextNode;
    const target = document.elementFromPoint(x, y);
    if (target?.closest?.("#edge-translate-root, #edge-translate-button")) return null;
    return findTextNode(target) || findTextNode(node);
}

function findTextNode(rootNode) {
    if (!rootNode) return null;
    if (rootNode.nodeType === Node.TEXT_NODE) return rootNode;
    const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT, {
        acceptNode(textNode) {
            return textNode.textContent?.trim()
                ? NodeFilter.FILTER_ACCEPT
                : NodeFilter.FILTER_REJECT;
        },
    });
    return walker.nextNode();
}

function isReasonableLongPressRange(range, x, y) {
    const text = range.toString().trim();
    return text.length > 0 && getHighlightRects(range).some((rect) => containsPoint(rect, x, y));
}

function containsPoint(rect, x, y) {
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function isTraversableElement(element) {
    return element && element !== document.body && element !== document.documentElement;
}

function isBlockContainerCandidate(element) {
    const display = window.getComputedStyle(element).display;
    return (
        /^(P|DIV|LI|TD|TH|BLOCKQUOTE|ARTICLE|SECTION|MAIN|ASIDE|PRE|H[1-6])$/.test(
            element.tagName
        ) || ["block", "list-item", "table-cell"].includes(display)
    );
}
