async function cropImage(screenshotUrl, rect, viewportWidth, viewportHeight) {
    const image = await loadImage(screenshotUrl);
    const sourceRect = resolveSourceRect(image, rect, viewportWidth, viewportHeight);
    const canvas = createCropCanvas(sourceRect);
    const context = canvas.getContext("2d", { alpha: false });

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(
        image,
        sourceRect.sourceX,
        sourceRect.sourceY,
        sourceRect.sourceWidth,
        sourceRect.sourceHeight,
        0,
        0,
        canvas.width,
        canvas.height
    );
    return canvas.toDataURL("image/png");
}

function resolveSourceRect(image, rect, viewportWidth, viewportHeight) {
    const scaleX = image.naturalWidth / viewportWidth;
    const scaleY = image.naturalHeight / viewportHeight;
    const sourceWidth = Math.max(1, Math.floor(rect.width * scaleX));
    const sourceHeight = Math.max(1, Math.floor(rect.height * scaleY));

    return {
        sourceX: Math.max(0, Math.floor(rect.left * scaleX)),
        sourceY: Math.max(0, Math.floor(rect.top * scaleY)),
        sourceWidth,
        sourceHeight,
        upscale: Math.max(1, Math.min(2, Math.floor(1200 / Math.max(sourceWidth, sourceHeight)))),
    };
}

function createCropCanvas(sourceRect) {
    const canvas = document.createElement("canvas");
    canvas.width = sourceRect.sourceWidth * sourceRect.upscale;
    canvas.height = sourceRect.sourceHeight * sourceRect.upscale;
    return canvas;
}

function loadImage(url) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("Failed to load screenshot for OCR."));
        image.src = url;
    });
}

function normalizeOcrText(text) {
    return text
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .join("\n")
        .replace(/[ \t]{2,}/g, " ")
        .trim();
}

export { cropImage, normalizeOcrText };
