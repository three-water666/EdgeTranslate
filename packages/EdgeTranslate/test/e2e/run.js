const jest = require("jest");

const browser = process.argv[2];
if (browser) {
    process.env.SELENIUM_BROWSER = browser === "edge" ? "MicrosoftEdge" : browser;
}

jest.run(["-i", "--config", "./test/e2e/jest/jest.config.js"]);
