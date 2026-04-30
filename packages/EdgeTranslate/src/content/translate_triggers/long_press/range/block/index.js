// 负责通过块级容器策略生成长按翻译文本范围。
import { DIRECT_TEXT_BLOCK_TAG_REGEXP } from "../../../shared/constants.js";
import { getCaretRangeFromPoint, resolveTargetTextNode } from "../shared/caret.js";
import { scoreContainer, isReasonableBlockContainer } from "./score.js";
import {
    collectTextNodes,
    containsPoint,
    getBlockTextLength,
    getSentenceContainer,
    isBlockContainerCandidate,
    isTraversableElement,
} from "../shared/text_nodes.js";

/**
 * 从坐标所在文本节点向上寻找合适的块级容器，并返回其完整文本范围。
 */
export function getBlockRangeFromPoint(x, y) {
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
