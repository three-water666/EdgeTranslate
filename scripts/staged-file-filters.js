"use strict";

const path = require("path");

// Centralize generated/vendor asset exclusions so pre-commit hooks stay aligned.
const EXCLUDED_STAGED_PATH_PREFIXES = [
    "packages/EdgeTranslate/static/google/elms/",
    "packages/EdgeTranslate/static/google/lans/",
    "packages/EdgeTranslate/static/pdf/",
];

const EXCLUDED_STAGED_FILE_PATHS = [
    "packages/EdgeTranslate/static/google/element_main.css",
    "packages/EdgeTranslate/static/google/element_main.js",
    "packages/EdgeTranslate/static/google/injection.js",
];

function normalizeFilePath(filePath) {
    return filePath.split(path.sep).join("/");
}

function isExcludedStagedFile(filePath) {
    const normalizedPath = normalizeFilePath(filePath);
    return (
        EXCLUDED_STAGED_PATH_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix)) ||
        EXCLUDED_STAGED_FILE_PATHS.includes(normalizedPath)
    );
}

module.exports = {
    EXCLUDED_STAGED_FILE_PATHS,
    EXCLUDED_STAGED_PATH_PREFIXES,
    isExcludedStagedFile,
    normalizeFilePath,
};
