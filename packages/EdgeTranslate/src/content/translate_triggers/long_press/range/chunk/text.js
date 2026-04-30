// 负责按句子边界计算长按片段取词的文本窗口。
import {
    SENTENCE_BOUNDARY_REGEXP,
    SENTENCE_TRAILING_REGEXP,
    CHUNK_TARGET_LENGTH,
    CHUNK_MAX_LENGTH,
    CHUNK_MIN_LENGTH,
} from "../../../shared/constants.js";

/**
 * 根据当前字符位置确定应翻译片段在完整文本中的边界。
 */
export function getChunkBounds(text, offset) {
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
export function resolveSentenceOffset(text, rawOffset) {
    if (!text?.length) return null;
    const offset = normalizeOffset(text, rawOffset);
    return (
        pickVisibleCharacter(text, [offset, offset - 1]) ??
        scanNearestVisibleCharacter(text, offset, pickVisibleCharacter)
    );
}

/**
 * 将多个文本节点拼接为完整文本，并记录每个节点的全局偏移。
 */
export function buildTextEntries(textNodes) {
    let fullText = "";
    return {
        items: textNodes.map((node) => {
            const start = fullText.length;
            const text = node.textContent || "";
            fullText += text;
            return { node, start, end: start + text.length };
        }),
        fullText,
    };
}

/**
 * 将完整文本中的全局索引映射回具体文本节点和节点内偏移。
 */
export function locateTextPosition(entries, index) {
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (index <= entry.end) {
            return {
                node: entry.node,
                offset: Math.max(0, Math.min(entry.node.textContent.length, index - entry.start)),
            };
        }
    }
    const lastEntry = entries[entries.length - 1];
    return { node: lastEntry.node, offset: lastEntry.node.textContent.length };
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
 * 从当前句子片段向前后扩展，形成接近目标长度的文本窗口。
 */
function expandChunkWindow(segments, currentIndex, targetLength, maxLength) {
    let state = {
        startIndex: currentIndex,
        endIndex: currentIndex,
        currentLength: segments[currentIndex].trimmedLength,
    };
    while (state.currentLength < targetLength) {
        const nextState = chooseExpansion(segments, state, maxLength);
        if (!nextState) break;
        state = nextState;
    }
    return state;
}

/**
 * 根据最大/最小长度限制修正片段边界，并去掉首尾空白。
 */
function normalizeChunkBounds(args) {
    let start = args.segments[args.expanded.startIndex].trimmedStart;
    let end = args.segments[args.expanded.endIndex].trimmedEnd;
    if (args.expanded.currentLength > args.limits.maxLength) {
        end = Math.min(end, start + args.limits.maxLength);
    }
    if (end - start < args.limits.minLength) {
        start = args.segments[args.currentIndex].trimmedStart;
        end = args.segments[args.currentIndex].trimmedEnd;
    }
    while (start < end && /\s/.test(args.text[start])) start += 1;
    while (end > start && /\s/.test(args.text[end - 1])) end -= 1;
    return { start, end };
}

/**
 * 将原始偏移量限制在文本有效索引范围内。
 */
function normalizeOffset(text, rawOffset) {
    let offset = Math.max(0, Math.min(rawOffset, text.length));
    if (offset === text.length) offset -= 1;
    return offset;
}

/**
 * 从候选索引中选择第一个非空白可见字符位置。
 */
function pickVisibleCharacter(text, indexes) {
    const visibleIndex = indexes.find((index) => text[index] && !/\s/.test(text[index]));
    return visibleIndex === undefined ? null : visibleIndex;
}

/**
 * 从指定偏移量向两侧扫描最近的可见字符。
 */
function scanNearestVisibleCharacter(text, offset, pickChar) {
    let left = offset - 1;
    let right = offset + 1;
    while (left >= 0 || right < text.length) {
        const hit = pickChar(text, [left, right]);
        if (hit !== null) return hit;
        left -= 1;
        right += 1;
    }
    return null;
}

/**
 * 将片段结束位置推进到连续尾随标点之后。
 */
function advanceTrailingBoundary(text, startIndex, trailingRegexp) {
    let segmentEnd = startIndex;
    while (segmentEnd < text.length && trailingRegexp.test(text[segmentEnd])) segmentEnd += 1;
    return segmentEnd;
}

/**
 * 去除片段首尾空白后，将有效片段加入列表。
 */
function pushSegment(segments, text, start, end) {
    let trimmedStart = start;
    let trimmedEnd = end;
    while (trimmedStart < trimmedEnd && /\s/.test(text[trimmedStart])) trimmedStart += 1;
    while (trimmedEnd > trimmedStart && /\s/.test(text[trimmedEnd - 1])) trimmedEnd -= 1;
    if (trimmedStart >= trimmedEnd) return;
    segments.push({
        start,
        end,
        trimmedStart,
        trimmedEnd,
        trimmedLength: trimmedEnd - trimmedStart,
    });
}

/**
 * 选择向前或向后扩展片段窗口的下一步。
 */
function chooseExpansion(segments, state, maxLength) {
    const previousSegment = segments[state.startIndex - 1];
    const nextSegment = segments[state.endIndex + 1];
    if (!previousSegment && !nextSegment) return null;
    const usePrevious = (previousSegment?.trimmedLength || 0) >= (nextSegment?.trimmedLength || 0);
    const candidate = usePrevious ? previousSegment : nextSegment;
    if (!candidate) return fallbackExpansion(state, usePrevious, previousSegment, nextSegment);
    if (state.currentLength + candidate.trimmedLength > maxLength) return null;
    return usePrevious
        ? {
              startIndex: state.startIndex - 1,
              endIndex: state.endIndex,
              currentLength: state.currentLength + candidate.trimmedLength,
          }
        : {
              startIndex: state.startIndex,
              endIndex: state.endIndex + 1,
              currentLength: state.currentLength + candidate.trimmedLength,
          };
}

/**
 * 当首选方向没有片段时，回退到另一侧继续扩展。
 */
function fallbackExpansion(state, usePrevious, previousSegment, nextSegment) {
    return usePrevious
        ? {
              startIndex: state.startIndex,
              endIndex: state.endIndex + 1,
              currentLength: state.currentLength + (nextSegment?.trimmedLength || 0),
          }
        : {
              startIndex: state.startIndex - 1,
              endIndex: state.endIndex,
              currentLength: state.currentLength + (previousSegment?.trimmedLength || 0),
          };
}
