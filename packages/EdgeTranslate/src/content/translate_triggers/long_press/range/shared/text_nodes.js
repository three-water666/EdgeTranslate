// 负责收集长按取词可用文本节点，并判断块级文本容器候选。
import { shouldIgnoreTarget } from "../../target.js";

/**
 * 收集根节点下所有可用于长按翻译的非空文本节点。
 */
export function collectTextNodes(rootNode) {
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
export function getBlockTextLength(element) {
    const textNodes = collectTextNodes(element);
    if (!textNodes.length) return 0;
    return textNodes.reduce((total, node) => total + (node.textContent || "").trim().length, 0);
}

/**
 * 查找承载当前句子上下文的块级容器。
 */
export function getSentenceContainer(textNode) {
    let element = textNode.parentElement;
    while (isTraversableElement(element)) {
        if (isBlockContainerCandidate(element)) return element;
        element = element.parentElement;
    }
    return textNode.parentElement || document.body;
}

/**
 * 判断坐标是否位于矩形区域内。
 */
export function containsPoint(rect, x, y) {
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

/**
 * 判断元素是否仍可继续向上遍历寻找容器。
 */
export function isTraversableElement(element) {
    return element && element !== document.body && element !== document.documentElement;
}

/**
 * 判断元素是否适合作为块级文本容器候选。
 */
export function isBlockContainerCandidate(element) {
    const display = window.getComputedStyle(element).display;
    return (
        /^(P|DIV|LI|TD|TH|BLOCKQUOTE|ARTICLE|SECTION|MAIN|ASIDE|PRE|H[1-6])$/.test(
            element.tagName
        ) || ["block", "list-item", "table-cell"].includes(display)
    );
}
