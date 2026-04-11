"use strict";

const { execFileSync, execSync } = require("child_process");
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
]);
const textBasenames = new Set([".babelrc", ".editorconfig", ".gitattributes", ".prettierrc"]);

function getBin(name) {
    const ext = process.platform === "win32" ? ".cmd" : "";
    return path.join(repoRoot, "node_modules", ".bin", `${name}${ext}`);
}

function quote(value) {
    return `"${value.replace(/"/g, '\\"')}"`;
}

function runBin(bin, args) {
    const command = [quote(bin), ...args.map(quote)].join(" ");
    execSync(command, {
        cwd: repoRoot,
        stdio: "inherit",
        shell: true,
    });
}

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

function shouldFormat(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const base = path.basename(filePath);
    return textExtensions.has(ext) || textBasenames.has(base);
}

function main() {
    const files = getStagedFiles()
        .filter((filePath) => !isExcludedStagedFile(filePath))
        .filter(shouldFormat);
    if (files.length === 0) {
        return;
    }

    runBin(getBin("prettier"), ["--write", "--ignore-unknown", ...files]);

    execFileSync("git", ["add", "--", ...files], {
        cwd: repoRoot,
        stdio: "inherit",
    });
}

main();
