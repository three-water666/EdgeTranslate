"use strict";

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { isExcludedStagedFile } = require("./staged-file-filters");

const repoRoot = path.resolve(__dirname, "..");
const textExtensions = new Set([
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".json",
    ".html",
    ".css",
    ".styl",
    ".md",
    ".yml",
    ".yaml",
    ".sh",
]);
const textBasenames = new Set([".babelrc", ".editorconfig", ".gitattributes", ".prettierrc"]);

function getStagedFiles() {
    const output = execFileSync("git", ["diff", "--cached", "--name-only", "--diff-filter=ACMR"], {
        cwd: repoRoot,
        encoding: "utf8",
    });

    return output
        .split(/\r?\n/)
        .map((file) => file.trim())
        .filter(Boolean);
}

function shouldCheck(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const base = path.basename(filePath);
    return textExtensions.has(ext) || textBasenames.has(base);
}

function hasCrlf(filePath) {
    const content = fs.readFileSync(path.join(repoRoot, filePath), "utf8");
    return content.includes("\r\n");
}

function main() {
    const stagedFiles = getStagedFiles()
        .filter((filePath) => !isExcludedStagedFile(filePath))
        .filter(shouldCheck);
    const invalidFiles = stagedFiles.filter(hasCrlf);

    if (invalidFiles.length === 0) {
        return;
    }

    console.error(
        "CRLF line endings detected in staged files. Please convert them to LF before committing:"
    );
    invalidFiles.forEach((file) => {
        console.error(`- ${file}`);
    });
    console.error(
        "Tip: reopen/save the file with LF in VS Code, or run a formatter that respects the repo settings."
    );
    process.exit(1);
}

main();
