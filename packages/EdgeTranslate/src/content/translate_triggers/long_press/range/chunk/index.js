// 负责通过分句片段策略生成长度适中的长按翻译文本范围。
import { getCaretRangeFromPoint, resolveTargetTextNode } from "../shared/caret.js";
import { collectTextNodes, getSentenceContainer } from "../shared/text_nodes.js";
import {
    buildTextEntries,
    getChunkBounds,
    locateTextPosition,
    resolveSentenceOffset,
} from "./text.js";

/**
 * 根据坐标所在文本节点构造一段长度适中的文本片段范围。
 */
export function getChunkRangeFromPoint(x, y) {
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
