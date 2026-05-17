"use strict";

const path = require("path");

// Centralize generated/vendor asset exclusions so pre-commit hooks stay aligned.
const EXCLUDED_STAGED_PATH_PREFIXES = ["packages/EdgeTranslate/static/pdf/"];

const EXCLUDED_STAGED_FILE_PATHS = [];

const PDFJS_VERSIONED_VENDOR_PATH_PATTERN = /^packages\/EdgeTranslate\/vendor\/pdfjs\/[0-9][^/]*\//;
const GOOGLE_TRANSLATE_VERSIONED_VENDOR_PATH_PATTERN =
    /^packages\/EdgeTranslate\/vendor\/google-translate-element\/[^/]+\//;

function normalizeFilePath(filePath) {
    return filePath.split(path.sep).join("/");
}

function isExcludedStagedFile(filePath) {
    const normalizedPath = normalizeFilePath(filePath);
    return (
        EXCLUDED_STAGED_PATH_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix)) ||
        EXCLUDED_STAGED_FILE_PATHS.includes(normalizedPath) ||
        PDFJS_VERSIONED_VENDOR_PATH_PATTERN.test(normalizedPath) ||
        GOOGLE_TRANSLATE_VERSIONED_VENDOR_PATH_PATTERN.test(normalizedPath)
    );
}

module.exports = {
    EXCLUDED_STAGED_FILE_PATHS,
    EXCLUDED_STAGED_PATH_PREFIXES,
    isExcludedStagedFile,
    normalizeFilePath,
};
