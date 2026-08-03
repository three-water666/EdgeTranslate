const DEFAULT_VIEWPORT = {
    width: 1600,
    height: 872,
};

function getBrowserLanguage() {
    return process.env.E2E_BROWSER_LANGUAGE || "en";
}

function getViewport() {
    return {
        width: parseDimension(process.env.E2E_VIEWPORT_WIDTH, DEFAULT_VIEWPORT.width),
        height: parseDimension(process.env.E2E_VIEWPORT_HEIGHT, DEFAULT_VIEWPORT.height),
    };
}

function parseDimension(value, fallback) {
    const parsedValue = Number.parseInt(value, 10);
    return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

module.exports = {
    getBrowserLanguage,
    getViewport,
};
