import {
    BLOCK_TEXT_IDEAL_LENGTH,
    BLOCK_TEXT_MAX_LENGTH,
    BLOCK_TEXT_MIN_LENGTH,
} from "./select_constants.js";

function scoreContainer({ element, x, y, collectTextNodes, containsPoint }) {
    if (!isValidBlockContainer(element, x, y, containsPoint)) return -1;
    const textNodes = collectTextNodes(element);
    const fullText = textNodes.reduce((acc, node) => acc + (node.textContent || ""), "");
    const textLength = fullText.trim().length;
    let score = getIdealLengthScore(element, textLength);
    score += getPunctuationBonus(fullText);
    score += getContainerTagBonus(element);
    score += getChildPenalty(element);
    return score;
}

function isValidBlockContainer(element, x, y, containsPoint) {
    return (
        !!element &&
        !isIgnoredElement(element) &&
        hasUsableRect(element, x, y, containsPoint) &&
        isReasonableBlockContainer(element)
    );
}

function isIgnoredElement(element) {
    return Boolean(
        element.closest?.(
            "#edge-translate-button, #edge-translate-root, #edge-translate-screenshot-overlay"
        )
    );
}

function hasUsableRect(element, x, y, containsPoint) {
    const rect = element.getBoundingClientRect();
    return !!rect.width && !!rect.height && containsPoint(rect, x, y);
}

function isReasonableBlockContainer(element) {
    const textLength = (element?.textContent || "").trim().length;
    const minLength = /^(LI|H[1-6]|TD|TH|CAPTION)$/.test(element.tagName)
        ? 2
        : BLOCK_TEXT_MIN_LENGTH;
    return textLength >= minLength && textLength <= BLOCK_TEXT_MAX_LENGTH;
}

function getContainerTagBonus(element) {
    if (/^(P|LI|BLOCKQUOTE|PRE)$/.test(element.tagName)) return 150;
    if (/^(H[1-6]|TD|TH|CAPTION)$/.test(element.tagName)) return 100;
    return 0;
}

function getIdealLengthScore(element, textLength) {
    let idealLength = BLOCK_TEXT_IDEAL_LENGTH;
    if (/^(H[1-6])$/.test(element.tagName)) idealLength = 40;
    else if (/^(LI|TD|TH)$/.test(element.tagName)) idealLength = 60;
    return 200 - Math.abs(idealLength - textLength) / 2;
}

function getPunctuationBonus(text) {
    const punctuationCount = (text.match(/[.!?。！？；;，,]/g) || []).length;
    return Math.min(punctuationCount, 10) * 15;
}

function getChildPenalty(element) {
    return element.childElementCount > 0 ? -element.childElementCount * 20 : 0;
}

export { scoreContainer, isReasonableBlockContainer };
