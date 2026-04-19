const { Browser } = require("selenium-webdriver");
const Driver = require("./driver");
const ChromeDriver = require("./chrome");
const EdgeDriver = require("./edge");

async function buildWebDriver(webDriverOptions = {}) {
    const browser = process.env.SELENIUM_BROWSER || Browser.CHROME;

    const {
        driver: seleniumDriver,
        extensionId,
        extensionUrl,
    } = await buildBrowserWebDriver(browser, webDriverOptions);
    const driver = new Driver(seleniumDriver, browser, extensionUrl);

    return {
        driver,
        extensionId,
    };
}

async function buildBrowserWebDriver(browser, webDriverOptions) {
    switch (browser) {
        case Browser.CHROME: {
            return await ChromeDriver.build(webDriverOptions);
        }
        case Browser.EDGE:
        case "edge": {
            return await EdgeDriver.build(webDriverOptions);
        }
        default: {
            throw new Error(`Unrecognized browser: ${browser}`);
        }
    }
}

module.exports = {
    buildWebDriver,
};
