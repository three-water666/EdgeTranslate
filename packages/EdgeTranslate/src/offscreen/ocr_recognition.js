import { PSM } from "tesseract.js";
import { normalizeOcrText } from "./ocr_image.js";

const VERTICAL_TEXT_MIN_ASPECT_RATIO = 1.6;
const LOW_CONFIDENCE_THRESHOLD = 45;
const SHORT_TEXT_CONFIDENCE_THRESHOLD = 70;
const VERTICAL_TEXT_OUTPUT = { text: true, blocks: true };

async function recognizeOcrImage(worker, image, rect) {
    const result = await recognizeImage(worker, image);

    if (!shouldRetryVerticalTextRecognition(result, rect)) {
        return normalizeOcrText(result.data.text);
    }

    const verticalResult = await recognizeImage(
        worker,
        image,
        {
            tessedit_pageseg_mode: PSM.SINGLE_BLOCK_VERT_TEXT,
        },
        VERTICAL_TEXT_OUTPUT
    );
    const betterResult = selectBetterOcrResult(result, verticalResult);
    return normalizeOcrText(getOcrResultText(betterResult));
}

function recognizeImage(worker, image, options, output) {
    return worker.recognize(image, options, output);
}

function shouldRetryVerticalTextRecognition(result, rect) {
    return isLikelyVerticalTextRect(rect) && isLowQualityOcrResult(result);
}

function isLikelyVerticalTextRect(rect) {
    const width = Number(rect?.width) || 0;
    const height = Number(rect?.height) || 0;
    return width > 0 && height / width >= VERTICAL_TEXT_MIN_ASPECT_RATIO;
}

function isLowQualityOcrResult(result) {
    const text = normalizeOcrText(result?.data?.text || "");
    const compactTextLength = text.replace(/\s/g, "").length;
    const confidence = Number(result?.data?.confidence);

    if (!text) return true;
    if (!Number.isFinite(confidence)) return false;
    if (confidence < LOW_CONFIDENCE_THRESHOLD) return true;
    return compactTextLength <= 2 && confidence < SHORT_TEXT_CONFIDENCE_THRESHOLD;
}

function selectBetterOcrResult(primaryResult, fallbackResult) {
    const primaryScore = getOcrResultScore(primaryResult);
    const fallbackScore = getOcrResultScore(fallbackResult);
    return fallbackScore > primaryScore ? fallbackResult : primaryResult;
}

function getOcrResultScore(result) {
    const text = normalizeOcrText(getOcrResultText(result));
    const compactTextLength = text.replace(/\s/g, "").length;
    const confidence = Number(result?.data?.confidence);
    const confidenceScore = Number.isFinite(confidence) ? confidence : 0;

    return compactTextLength * 10 + confidenceScore;
}

function getOcrResultText(result) {
    if (hasOcrBlocks(result)) {
        const verticalText = reorderVerticalOcrText(result.data.blocks);
        if (verticalText) return verticalText;
    }

    return result?.data?.text || "";
}

function hasOcrBlocks(result) {
    return Array.isArray(result?.data?.blocks) && result.data.blocks.length > 0;
}

function reorderVerticalOcrText(blocks) {
    const items = collectOcrTextItems(blocks);
    if (items.length === 0) return "";

    return groupVerticalTextColumns(items)
        .map((column) =>
            column.items
                .sort((a, b) => a.centerY - b.centerY)
                .map((item) => item.text)
                .join("")
        )
        .join("");
}

function collectOcrTextItems(blocks) {
    return blocks.flatMap((block) => collectBlockTextItems(block));
}

function collectBlockTextItems(block) {
    return (block.paragraphs || []).flatMap((paragraph) => collectParagraphTextItems(paragraph));
}

function collectParagraphTextItems(paragraph) {
    return (paragraph.lines || []).flatMap((line) => collectLineTextItems(line));
}

function collectLineTextItems(line) {
    return (line.words || []).flatMap((word) => collectWordTextItems(word));
}

function collectWordTextItems(word) {
    const symbols = (word.symbols || []).map(createOcrTextItem).filter(Boolean);
    return symbols.length > 0 ? symbols : [createOcrTextItem(word)].filter(Boolean);
}

function createOcrTextItem(source) {
    const text = normalizeOcrSymbolText(source?.text);
    const bbox = source?.bbox;
    if (!text || !bbox) return null;

    const width = Math.max(1, Number(bbox.x1) - Number(bbox.x0));
    const height = Math.max(1, Number(bbox.y1) - Number(bbox.y0));
    return {
        text,
        width,
        height,
        centerX: Number(bbox.x0) + width / 2,
        centerY: Number(bbox.y0) + height / 2,
    };
}

function normalizeOcrSymbolText(text) {
    return String(text || "").replace(/\s+/g, "");
}

function groupVerticalTextColumns(items) {
    const columnThreshold = getVerticalColumnThreshold(items);
    const columns = [];

    items
        .slice()
        .sort((a, b) => b.centerX - a.centerX)
        .forEach((item) => {
            const column = findNearestColumn(columns, item, columnThreshold);
            if (column) {
                column.items.push(item);
                column.centerX = getAverageCenterX(column.items);
                return;
            }

            columns.push({
                centerX: item.centerX,
                items: [item],
            });
        });

    return columns.sort((a, b) => b.centerX - a.centerX);
}

function getVerticalColumnThreshold(items) {
    const medianWidth = getMedianValue(items.map((item) => item.width));
    const medianHeight = getMedianValue(items.map((item) => item.height));
    return Math.max(8, medianWidth * 1.25, medianHeight * 0.35);
}

function getMedianValue(values) {
    const sortedValues = values.filter(Number.isFinite).sort((a, b) => a - b);
    if (sortedValues.length === 0) return 0;

    return sortedValues[Math.floor(sortedValues.length / 2)];
}

function findNearestColumn(columns, item, threshold) {
    return columns.reduce((nearestColumn, column) => {
        const distance = Math.abs(column.centerX - item.centerX);
        if (distance > threshold) return nearestColumn;
        if (!nearestColumn || distance < nearestColumn.distance) {
            return { column, distance };
        }
        return nearestColumn;
    }, null)?.column;
}

function getAverageCenterX(items) {
    return items.reduce((sum, item) => sum + item.centerX, 0) / items.length;
}

export {
    recognizeOcrImage,
    reorderVerticalOcrText,
    selectBetterOcrResult,
    shouldRetryVerticalTextRecognition,
};
