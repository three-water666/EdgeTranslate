/**
 * 从文本节点向上收集可作为长按翻译范围的块级容器候选。
 */
export function collectBlockCandidates(textNode, isTraversableElement, isBlockContainerCandidate) {
    const candidates = [];
    for (
        let element = textNode.parentElement;
        isTraversableElement(element);
        element = element.parentElement
    ) {
        if (isBlockContainerCandidate(element)) candidates.push(element);
    }
    return candidates;
}

/**
 * 在候选容器中按评分选择最适合的长按翻译容器。
 */
export function pickBestBlockContainer(candidates, x, y, scoreContainer) {
    let bestContainer = candidates[0];
    let bestScore = scoreContainer(bestContainer, x, y);
    candidates.forEach((candidate) => {
        const score = scoreContainer(candidate, x, y);
        if (score > bestScore) {
            bestContainer = candidate;
            bestScore = score;
        }
    });
    return bestContainer;
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
 * 从当前句子片段向前后扩展，形成接近目标长度的文本窗口。
 */
export function expandChunkWindow(segments, currentIndex, targetLength, maxLength) {
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
export function normalizeChunkBounds(args) {
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
export function normalizeOffset(text, rawOffset) {
    let offset = Math.max(0, Math.min(rawOffset, text.length));
    if (offset === text.length) offset -= 1;
    return offset;
}

/**
 * 从候选索引中选择第一个非空白可见字符位置。
 */
export function pickVisibleCharacter(text, indexes) {
    const visibleIndex = indexes.find((index) => text[index] && !/\s/.test(text[index]));
    return visibleIndex === undefined ? null : visibleIndex;
}

/**
 * 从指定偏移量向两侧扫描最近的可见字符。
 */
export function scanNearestVisibleCharacter(text, offset, pickChar) {
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
export function advanceTrailingBoundary(text, startIndex, trailingRegexp) {
    let segmentEnd = startIndex;
    while (segmentEnd < text.length && trailingRegexp.test(text[segmentEnd])) segmentEnd += 1;
    return segmentEnd;
}

/**
 * 去除片段首尾空白后，将有效片段加入列表。
 */
export function pushSegment(segments, text, start, end) {
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
 * 保存当前页面选区范围，便于临时操作后恢复。
 */
export function snapshotSelectionRanges(selection) {
    const ranges = [];
    for (let i = 0; i < selection.rangeCount; i++) {
        ranges.push(selection.getRangeAt(i).cloneRange());
    }
    return ranges;
}

/**
 * 恢复之前保存的页面选区范围。
 */
export function restoreSelectionRanges(selection, ranges) {
    selection.removeAllRanges();
    ranges.forEach((range) => selection.addRange(range));
}

/**
 * 克隆文本范围并折叠到起点。
 */
export function collapseRange(range) {
    const collapsed = range.cloneRange();
    collapsed.collapse(true);
    return collapsed;
}

/**
 * 克隆当前选区的第一个非折叠范围。
 */
export function cloneSelectionRange(selection) {
    if (!selection.rangeCount) return null;
    const result = selection.getRangeAt(0).cloneRange();
    return result.collapsed ? null : result;
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
