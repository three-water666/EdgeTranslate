"use strict";

const { execFileSync, execSync } = require("child_process");
const path = require("path");
const { isExcludedStagedFile } = require("./staged-file-filters");

const repoRoot = path.resolve(__dirname, "..");
const localRulesDir = path.join(repoRoot, "eslint", "rules");
const edgeTranslateExtensions = new Set([".js", ".jsx"]);
const translatorsExtensions = new Set([".ts", ".tsx"]);

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

function shouldLintEdgeTranslate(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return edgeTranslateExtensions.has(ext) && filePath.startsWith("packages/EdgeTranslate/");
}

function shouldLintTranslators(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return translatorsExtensions.has(ext) && filePath.startsWith("packages/translators/");
}

function main() {
    const stagedFiles = getStagedFiles().filter((filePath) => !isExcludedStagedFile(filePath));
    const edgeTranslateFiles = stagedFiles.filter(shouldLintEdgeTranslate);
    const translatorsFiles = stagedFiles.filter(shouldLintTranslators);

    if (edgeTranslateFiles.length > 0) {
        runBin(getBin("eslint"), [
            "--rulesdir",
            localRulesDir,
            "--fix",
            "--config",
            "packages/EdgeTranslate/.eslintrc.js",
            ...edgeTranslateFiles,
        ]);

        execFileSync("git", ["add", "--", ...edgeTranslateFiles], {
            cwd: repoRoot,
            stdio: "inherit",
        });
    }

    if (translatorsFiles.length > 0) {
        runBin(getBin("eslint"), [
            "--fix",
            "--config",
            "packages/translators/.eslintrc.js",
            ...translatorsFiles,
        ]);

        execFileSync("git", ["add", "--", ...translatorsFiles], {
            cwd: repoRoot,
            stdio: "inherit",
        });
    }
}

main();
