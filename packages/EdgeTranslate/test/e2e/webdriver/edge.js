const fs = require("fs");
const os = require("os");
const path = require("path");
const { Builder } = require("selenium-webdriver");
const edge = require("selenium-webdriver/edge");
const edgedriver = require("edgedriver");
let proxy = require("selenium-webdriver/proxy");

class EdgeDriver {
    static async build({ responsive, port, headless, language, proxyUrl }) {
        const extensionPath = path.resolve(process.cwd(), "build/chrome").replace(/\\/g, "/");
        const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "edgetranslate-edge-e2e-"));
        const args = buildBrowserArgs({
            extensionPath,
            userDataDir,
            responsive,
            headless,
            language,
            proxyUrl,
        });
        const options = buildEdgeOptions(args, proxyUrl);
        console.log(`[e2e] edge args: ${args.join(" ")}`);

        const builder = new Builder().forBrowser("MicrosoftEdge").setEdgeOptions(options);
        const edgeDriverPath = await edgedriver.download();
        console.log(`[e2e] edgedriver path: ${edgeDriverPath}`);
        builder.setEdgeService(buildEdgeService(edgeDriverPath, port));
        console.log("[e2e] building Edge webdriver");
        return await createDriverSession(builder.build(), extensionPath, userDataDir);
    }

    constructor(driver, extensionPath, userDataDir) {
        this._driver = driver;
        this._extensionPath = normalizePath(extensionPath);
        this._userDataDir = userDataDir;
    }

    async getExtensionIdByPath() {
        return await waitForExtensionIdFromTargets(this._driver).catch(
            async () =>
                await waitForExtensionId(
                    path.join(this._userDataDir, "Default"),
                    this._extensionPath
                )
        );
    }
}

function buildBrowserArgs({
    extensionPath,
    userDataDir,
    responsive,
    headless,
    language,
    proxyUrl,
}) {
    const args = [`user-data-dir=${userDataDir}`, `load-extension=${extensionPath}`];
    if (responsive) args.push("--auto-open-devtools-for-tabs");
    if (headless) args.push("--headless");
    if (language) args.push(`--lang=${language}`);
    if (proxyUrl) args.push("ignore-certificate-errors");
    return args;
}

function buildEdgeOptions(args, proxyUrl) {
    const options = new edge.Options().addArguments(args).excludeSwitches("disable-extensions");
    if (process.env.EDGE_BINARY) {
        options.setEdgeChromiumBinaryPath(process.env.EDGE_BINARY);
    }
    if (proxyUrl) {
        options.setProxy(proxy.manual({ http: proxyUrl, https: proxyUrl }));
    }
    return options;
}

function buildEdgeService(edgeDriverPath, port) {
    const service = new edge.ServiceBuilder(edgeDriverPath);
    service
        .enableVerboseLogging()
        .loggingTo(path.resolve(process.cwd(), "test/e2e/edgedriver.log"));
    if (port) {
        service.setPort(port);
    }
    return service;
}

async function createDriverSession(driver, extensionPath, userDataDir) {
    const edgeDriver = new EdgeDriver(driver, extensionPath, userDataDir);
    console.log("[e2e] resolving extension id");
    const extensionId = await edgeDriver.getExtensionIdByPath();
    console.log(`[e2e] extension id: ${extensionId}`);

    return {
        driver,
        extensionId,
        extensionUrl: `chrome-extension://${extensionId}`,
    };
}

async function waitForExtensionIdFromTargets(driver, timeout = 10000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        const result = await driver.sendAndGetDevToolsCommand("Target.getTargets");
        const targets = result?.targetInfos || [];
        const extensionTarget = targets.find((target) =>
            target.url?.startsWith("chrome-extension://")
        );
        const id = extensionTarget?.url?.match(/^chrome-extension:\/\/([^/]+)/)?.[1];
        if (id) {
            return id;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error("Failed to find extension target via DevTools.");
}

async function waitForExtensionId(profileDir, expectedPath, timeout = 10000) {
    const startTime = Date.now();
    let lastError;
    let lastLoadedExtensions = [];
    while (Date.now() - startTime < timeout) {
        try {
            const extensionSettings = await readExtensionSettings(profileDir);
            for (const [id, settings] of Object.entries(extensionSettings)) {
                if (normalizePath(settings?.path) === expectedPath) {
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
        `Failed to find extension in Edge profile preferences. profile=${profileDir}, expectedPath=${expectedPath}, loaded=${JSON.stringify(
            lastLoadedExtensions
        )}, lastError=${lastError?.message}`
    );
}

async function readExtensionSettings(profileDir) {
    const settings = {};
    for (const file of ["Preferences", "Secure Preferences"]) {
        const filePath = path.join(profileDir, file);
        try {
            const preferences = JSON.parse(await fs.promises.readFile(filePath, "utf8"));
            Object.assign(settings, preferences?.extensions?.settings || {});
        } catch {
            // Chrome-family browsers create these files asynchronously.
        }
    }
    return settings;
}

function normalizePath(filePath) {
    return filePath?.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
}

module.exports = EdgeDriver;
