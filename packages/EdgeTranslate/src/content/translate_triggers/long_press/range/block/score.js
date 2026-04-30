// 负责为长按块级容器取词策略计算候选容器分数。
import {
    BLOCK_TEXT_IDEAL_LENGTH,
    BLOCK_TEXT_MAX_LENGTH,
    BLOCK_TEXT_MIN_LENGTH,
} from "../../../shared/constants.js";

/**
 * 为块级容器计算长按翻译适配分数。
 */
function scoreContainer({ element, x, y, depth = 0, collectTextNodes, containsPoint }) {
    const textNodes = collectTextNodes(element);
    const fullText = textNodes.reduce((acc, node) => acc + (node.textContent || ""), "");
    const blockTextLength = textNodes.reduce(
        (total, node) => total + (node.textContent || "").trim().length,
        0
    );
    if (!isValidBlockContainer({ element, x, y, textLength: blockTextLength, containsPoint })) {
        return -1;
    }

    const textLength = fullText.trim().length;
    let score = getIdealLengthScore(element, textLength);
    score += getPunctuationBonus(fullText);
    score += getContainerTagBonus(element);
    score += getChildPenalty(element);
    score += getDepthPenalty(depth);
    return score;
}

/**
 * 判断容器是否可见、可命中且文本长度合理。
 */
function isValidBlockContainer({ element, x, y, textLength, containsPoint }) {
    return (
        !!element &&
        !isIgnoredElement(element) &&
        hasUsableRect(element, x, y, containsPoint) &&
        isReasonableBlockContainer(element, textLength)
    );
}

/**
 * 判断元素是否属于插件自身 UI，需要排除在长按取词之外。
 */
function isIgnoredElement(element) {
    return Boolean(
        element.closest?.(
            "#edge-translate-button, #edge-translate-root, #edge-translate-screenshot-overlay"
        )
    );
}

/**
 * 判断元素是否有有效布局区域并包含长按坐标。
 */
function hasUsableRect(element, x, y, containsPoint) {
    const rect = element.getBoundingClientRect();
    return !!rect.width && !!rect.height && containsPoint(rect, x, y);
}

/**
 * 判断块级容器的文本长度是否适合作为翻译范围。
 */
function isReasonableBlockContainer(
    element,
    textLength = (element?.textContent || "").trim().length
) {
    const minLength = /^(LI|H[1-6]|TD|TH|CAPTION)$/.test(element.tagName)
        ? 2
        : BLOCK_TEXT_MIN_LENGTH;
    return textLength >= minLength && textLength <= BLOCK_TEXT_MAX_LENGTH;
}

/**
 * 根据标签语义给更像自然文本块的容器加分。
 */
function getContainerTagBonus(element) {
    if (/^(P|LI|BLOCKQUOTE|PRE)$/.test(element.tagName)) return 150;
    if (/^(H[1-6]|TD|TH|CAPTION)$/.test(element.tagName)) return 100;
    return 0;
}

/**
 * 根据文本长度和标签类型计算接近理想长度的分数。
 */
function getIdealLengthScore(element, textLength) {
    let idealLength = BLOCK_TEXT_IDEAL_LENGTH;
    if (/^(H[1-6])$/.test(element.tagName)) idealLength = 40;
    else if (/^(LI|TD|TH)$/.test(element.tagName)) idealLength = 60;
    return 200 - Math.abs(idealLength - textLength) / 2;
}

/**
 * 根据句读标点数量给更完整的自然语言文本加分。
 */
function getPunctuationBonus(text) {
    const punctuationCount = (text.match(/[.!?。！？；;，,]/g) || []).length;
    return Math.min(punctuationCount, 10) * 15;
}

/**
 * 对子元素过多的容器扣分，降低误选大容器的概率。
 */
function getChildPenalty(element) {
    return element.childElementCount > 0 ? -element.childElementCount * 20 : 0;
}

/**
 * 优先选择更贴近命中文本的内层容器。
 */
function getDepthPenalty(depth) {
    return -depth * 10;
}

export { scoreContainer, isReasonableBlockContainer };
