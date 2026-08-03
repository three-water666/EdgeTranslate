const path = require("path");
const { defineConfig } = require("@playwright/test");
const { getBrowserLanguage, getViewport } = require("./playwright/environment");

const language = getBrowserLanguage().replace(/[^a-zA-Z0-9_-]/g, "_");
const viewport = getViewport();

module.exports = defineConfig({
    testDir: path.resolve(__dirname, "tests"),
    testMatch: "**/*.spec.js",
    timeout: 100_000,
    expect: {
        timeout: 10_000,
        toHaveScreenshot: {
            animations: "disabled",
            caret: "hide",
            maxDiffPixelRatio: 0.01,
            pathTemplate: path.resolve(
                __dirname,
                "image_snapshots/playwright/chromium/{platform}",
                language,
                `${viewport.width}x${viewport.height}`,
                "{testFileBaseName}",
                "{arg}{ext}"
            ),
            scale: "css",
        },
    },
    fullyParallel: false,
    workers: 1,
    retries: process.env.CI ? 1 : 0,
    reporter: "line",
    outputDir: path.resolve(__dirname, "test-results"),
    projects: [{ name: "functional" }, { name: "visual" }],
    use: {
        actionTimeout: 10_000,
        navigationTimeout: 15_000,
        screenshot: "only-on-failure",
        trace: "retain-on-failure",
    },
});
