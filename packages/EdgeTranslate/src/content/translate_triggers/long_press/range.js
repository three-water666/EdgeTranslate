import {
    SENTENCE_BOUNDARY_REGEXP,
    SENTENCE_TRAILING_REGEXP,
    CHUNK_TARGET_LENGTH,
    CHUNK_MAX_LENGTH,
    CHUNK_MIN_LENGTH,
    DIRECT_TEXT_BLOCK_TAG_REGEXP,
} from "../shared/constants.js";
import { scoreContainer, isReasonableBlockContainer } from "./score.js";
import { getVisibleRangeRects } from "./rects.js";
import { shouldIgnoreTarget } from "./target.js";
import {
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
} from "./utils.js";

/**
 * 根据页面坐标获取长按应翻译的文本范围。
 */
export function getLongPressRangeFromPoint(x, y) {
    return getBlockRangeFromPoint(x, y) || getNativeOrChunkRange(x, y);
}

/**
 * 优先尝试浏览器原生段落范围，失败时回退到分句片段范围。
 */
function getNativeOrChunkRange(x, y) {
    const nativeRange = getNativeParagraphRangeFromPoint(x, y);
    if (nativeRange && isReasonableLongPressRange(nativeRange, x, y)) return nativeRange;
    return getChunkRangeFromPoint(x, y);
}

/**
 * 从坐标所在文本节点向上寻找合适的块级容器，并返回其完整文本范围。
 */
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

/**
 * 为文本节点选择最适合作为长按翻译单位的块级容器。
 */
function getPreferredBlockContainer(textNode, x, y) {
    const directContainer = getDirectTextBlockContainer(textNode);
    if (directContainer) return directContainer;
    return findBestAncestorBlockContainer(textNode, x, y);
}

/**
 * 从当前文本节点向上评分，选择最合适的块级容器。
 */
function findBestAncestorBlockContainer(textNode, x, y) {
    const best = {
        container: getSentenceContainer(textNode),
        score: null,
    };
    best.score = getBlockContainerScore(best.container, x, y, 0);

    let depth = 0;
    let currentElement = textNode.parentElement;
    while (isTraversableElement(currentElement)) {
        if (isBlockContainerCandidate(currentElement)) {
            const score = getBlockContainerScore(currentElement, x, y, depth);
            if (score > best.score) {
                best.container = currentElement;
                best.score = score;
            }
        }

        currentElement = currentElement.parentElement;
        depth += 1;
    }

    return best.container;
}

/**
 * 查找文本节点直接归属的简单块级容器。
 */
function getDirectTextBlockContainer(textNode) {
    let currentElement = textNode.parentElement;
    while (isTraversableElement(currentElement)) {
        if (
            DIRECT_TEXT_BLOCK_TAG_REGEXP.test(currentElement.tagName) &&
            isReasonableBlockContainer(currentElement, getBlockTextLength(currentElement))
        ) {
            return currentElement;
        }
        currentElement = currentElement.parentElement;
    }
    return null;
}

/**
 * 为块级候选容器计算长按翻译适配分数。
 */
function getBlockContainerScore(element, x, y, depth = 0) {
    return scoreContainer({
        element,
        x,
        y,
        depth,
        collectTextNodes,
        containsPoint,
    });
}

/**
 * 使用浏览器 Selection API 获取坐标处的原生段落范围。
 */
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

/**
 * 根据坐标所在文本节点构造一段长度适中的文本片段范围。
 */
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

/**
 * 计算文本节点偏移量在合并文本中的片段起止位置。
 */
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

/**
 * 根据当前字符位置确定应翻译片段在完整文本中的边界。
 */
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

/**
 * 将原始偏移量修正到附近可见字符的位置。
 */
function resolveSentenceOffset(text, rawOffset) {
    if (!text?.length) return null;
    const offset = normalizeOffset(text, rawOffset);
    return (
        pickVisibleCharacter(text, [offset, offset - 1]) ??
        scanNearestVisibleCharacter(text, offset, pickVisibleCharacter)
    );
}

/**
 * 按中英文句末标点将文本拆成可扩展的句子片段。
 */
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

/**
 * 查找承载当前句子上下文的块级容器。
 */
function getSentenceContainer(textNode) {
    let element = textNode.parentElement;
    while (isTraversableElement(element)) {
        if (isBlockContainerCandidate(element)) return element;
        element = element.parentElement;
    }
    return textNode.parentElement || document.body;
}

/**
 * 收集根节点下所有可用于长按翻译的非空文本节点。
 */
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

/**
 * 统计容器内实际会参与长按翻译的文本长度。
 */
function getBlockTextLength(element) {
    const textNodes = collectTextNodes(element);
    if (!textNodes.length) return 0;
    return textNodes.reduce((total, node) => total + (node.textContent || "").trim().length, 0);
}

/**
 * 从光标范围中解析实际命中的文本节点。
 */
function resolveTargetTextNode(caretRange, x, y) {
    return caretRange.startContainer.nodeType === Node.TEXT_NODE
        ? caretRange.startContainer
        : getNearestTextNode(caretRange.startContainer, x, y, caretRange.startOffset);
}

/**
 * 兼容不同浏览器，从页面坐标获取折叠的光标范围。
 */
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

/**
 * 在给定节点或坐标命中的元素附近查找最近的文本节点。
 */
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

/**
 * 在节点子树中查找第一个非空文本节点。
 */
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

/**
 * 判断原生段落范围是否有文本且覆盖长按坐标。
 */
function isReasonableLongPressRange(range, x, y) {
    const text = range.toString().trim();
    return (
        text.length >= Math.min(CHUNK_MIN_LENGTH, 2) &&
        getVisibleRangeRects(range).some((rect) => containsPoint(rect, x, y))
    );
}

/**
 * 判断坐标是否位于矩形区域内。
 */
function containsPoint(rect, x, y) {
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

/**
 * 判断元素是否仍可继续向上遍历寻找容器。
 */
function isTraversableElement(element) {
    return element && element !== document.body && element !== document.documentElement;
}

/**
 * 判断元素是否适合作为块级文本容器候选。
 */
function isBlockContainerCandidate(element) {
    const display = window.getComputedStyle(element).display;
    return (
        /^(P|DIV|LI|TD|TH|BLOCKQUOTE|ARTICLE|SECTION|MAIN|ASIDE|PRE|H[1-6])$/.test(
            element.tagName
        ) || ["block", "list-item", "table-cell"].includes(display)
    );
}
