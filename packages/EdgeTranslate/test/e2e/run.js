const jest = require("jest");

const DEFAULT_MODE = "functional";
const SUPPORTED_MODES = new Set(["functional", "visual"]);

const { browser, mode } = parseArgs(process.argv.slice(2));
process.env.E2E_TEST_MODE = mode;

if (browser) {
    process.env.SELENIUM_BROWSER = browser === "edge" ? "MicrosoftEdge" : browser;
}

console.log(`[e2e] running ${mode} tests`);
jest.run(["-i", "--config", "./test/e2e/jest/jest.config.js"]);

function parseArgs(args) {
    let browser;
    let mode = DEFAULT_MODE;

    for (const arg of args) {
        if (arg === "--functional") {
            mode = "functional";
        } else if (arg === "--visual") {
            mode = "visual";
        } else if (arg.startsWith("--mode=")) {
            mode = arg.slice("--mode=".length);
        } else if (arg.startsWith("--browser=")) {
            browser = arg.slice("--browser=".length);
        } else if (SUPPORTED_MODES.has(arg)) {
            mode = arg;
        } else if (arg) {
            browser = arg;
        }
    }

    if (!SUPPORTED_MODES.has(mode)) {
        throw new Error(`Unsupported e2e mode: ${mode}`);
    }

    return { browser, mode };
}
