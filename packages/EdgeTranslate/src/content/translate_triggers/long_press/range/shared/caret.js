// 负责把页面坐标转换为光标范围，并解析坐标附近可用文本节点。
/**
 * 兼容不同浏览器，从页面坐标获取折叠的光标范围。
 */
export function getCaretRangeFromPoint(x, y) {
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
 * 从光标范围中解析实际命中的文本节点。
 */
export function resolveTargetTextNode(caretRange, x, y) {
    return caretRange.startContainer.nodeType === Node.TEXT_NODE
        ? caretRange.startContainer
        : getNearestTextNode(caretRange.startContainer, x, y, caretRange.startOffset);
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
