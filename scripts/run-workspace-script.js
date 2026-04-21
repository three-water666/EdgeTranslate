"use strict";

const { execSync } = require("child_process");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const scriptName = process.argv[2];
const packageDirs = ["packages/EdgeTranslate", "packages/translators"];

if (!scriptName) {
    console.error("Usage: node scripts/run-workspace-script.js <script-name>");
    process.exit(1);
}

let hasFailure = false;

for (const packageDir of packageDirs) {
    try {
        execSync(`pnpm run ${scriptName}`, {
            cwd: path.join(repoRoot, packageDir),
            stdio: "inherit",
            shell: true,
        });
    } catch (error) {
        hasFailure = true;
        if (error.status == null) {
            console.error(`Failed to run "${scriptName}" in ${packageDir}.`);
        }
    }
}

if (hasFailure) {
    process.exit(1);
}
