"use strict";

const path = require("path");
const { spawnSync } = require("child_process");

const repoRoot = path.resolve(__dirname, "..");
const eslintBin = path.join(
    repoRoot,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "eslint.cmd" : "eslint"
);
const packageDir = process.argv[2];
const eslintArgs = process.argv.slice(3);

if (!packageDir || eslintArgs.length === 0) {
    console.error("Usage: node scripts/run-eslint.js <package-dir> <eslint-args...>");
    process.exit(1);
}

const result = spawnSync(eslintBin, eslintArgs, {
    cwd: path.join(repoRoot, packageDir),
    stdio: "inherit",
    shell: process.platform === "win32",
});

if (result.error) {
    throw result.error;
}

process.exit(result.status ?? 0);
