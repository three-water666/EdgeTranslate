const fs = require("fs");
const path = require("path");
const { Builder } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const chromedriver = require("chromedriver");
let proxy = require("selenium-webdriver/proxy");

/**
 * A wrapper around a {@code WebDriver} instance exposing Chrome-specific functionality
 */
class ChromeDriver {
    static async build({ responsive, port, headless, language, proxyUrl }) {
        const extensionPath = path.resolve(process.cwd(), "build/chrome").replace(/\\/g, "/");
        const args = buildBrowserArgs({ extensionPath, responsive, headless, language, proxyUrl });
        const options = buildChromeOptions(args, proxyUrl);
        console.log(`[e2e] chrome args: ${args.join(" ")}`);
        console.log(`[e2e] chromedriver path: ${chromedriver.path}`);

        const builder = new Builder().forBrowser("chrome").setChromeOptions(options);
        builder.setChromeService(buildChromeService(port));
        console.log("[e2e] building Chrome webdriver");
        return await createDriverSession(builder.build(), extensionPath);
    }

    /**
     * @constructor
     * @param {!ThenableWebDriver} driver - a {@code WebDriver} instance
     */
    constructor(driver, extensionPath) {
        this._driver = driver;
        this._extensionPath = extensionPath;
    }

    /**
     * Returns the extension ID for the given extension name
     * @param {string} extensionName - the extension name
     * @returns {Promise<string|undefined>} the extension ID
     */
    async getExtensionIdByName(extensionName) {
        const capabilities = await this._driver.getCapabilities();
        const userDataDir = capabilities.get("chrome")?.userDataDir;
        if (!userDataDir) {
            throw new Error("Chrome capabilities did not include userDataDir.");
        }

        const preferencesPath = path.join(userDataDir, "Default", "Preferences");
        const expectedExtensionPath = normalizePath(this._extensionPath);
        return await waitForExtensionId(preferencesPath, {
            names: new Set([extensionName, "__MSG_AppName__"]),
            path: expectedExtensionPath,
        });
    }
}

function buildBrowserArgs({ extensionPath, responsive, headless, language, proxyUrl }) {
    const args = [`load-extension=${extensionPath}`];
    if (responsive) args.push("--auto-open-devtools-for-tabs");
    if (headless) args.push("--headless");
    if (language) args.push(`--lang=${language}`);
    if (proxyUrl) args.push("ignore-certificate-errors");
    return args;
}

function buildChromeOptions(args, proxyUrl) {
    const options = new chrome.Options().addArguments(args).excludeSwitches("disable-extensions");
    if (proxyUrl) {
        options.setProxy(proxy.manual({ http: proxyUrl, https: proxyUrl }));
    }
    return options;
}

function buildChromeService(port) {
    const service = new chrome.ServiceBuilder(chromedriver.path);
    service
        .enableVerboseLogging()
        .loggingTo(path.resolve(process.cwd(), "test/e2e/chromedriver.log"));
    if (port) {
        service.setPort(port);
    }
    return service;
}

async function createDriverSession(driver, extensionPath) {
    const chromeDriver = new ChromeDriver(driver, extensionPath);
    console.log("[e2e] resolving extension id");
    const extensionId = await chromeDriver.getExtensionIdByName("Edge Translate");
    if (!extensionId) {
        throw new Error("Failed to resolve the loaded Edge Translate extension id.");
    }
    console.log(`[e2e] extension id: ${extensionId}`);

    return {
        driver,
        extensionId,
        extensionUrl: `chrome-extension://${extensionId}`,
    };
}

async function waitForExtensionId(preferencesPath, expected, timeout = 10000) {
    const startTime = Date.now();
    let lastError;
    let lastLoadedExtensions = [];
    while (Date.now() - startTime < timeout) {
        try {
            const preferences = JSON.parse(await fs.promises.readFile(preferencesPath, "utf8"));
            const extensionSettings = preferences?.extensions?.settings || {};
            for (const [id, settings] of Object.entries(extensionSettings)) {
                const extensionPath = normalizePath(settings?.path);
                if (
                    expected.names.has(settings?.manifest?.name) ||
                    extensionPath === expected.path
                ) {
                    return id;
                }
            }

            lastLoadedExtensions = Object.entries(extensionSettings).map(([id, settings]) => ({
                id,
                name: settings?.manifest?.name,
                path: settings?.path,
                state: settings?.state,
            }));
        } catch (error) {
            lastError = error;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(
        `Failed to find extension in Chrome profile preferences. preferences=${preferencesPath}, expectedPath=${
            expected.path
        }, loaded=${JSON.stringify(lastLoadedExtensions)}, lastError=${lastError?.message}`
    );
}

function normalizePath(filePath) {
    return filePath?.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
}

module.exports = ChromeDriver;
