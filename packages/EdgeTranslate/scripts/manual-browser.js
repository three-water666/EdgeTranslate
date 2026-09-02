const path = require("path");
const { chromium } = require("@playwright/test");

const DEFAULT_PAGE_URL = "https://github.com/three-water666/EdgeTranslate";
const MANUAL_PROFILE_ROOT = path.resolve(__dirname, "../dev/browser-profiles");
const SERVICE_WORKER_TIMEOUT = 15_000;
const PAGE_NAVIGATION_TIMEOUT = 30_000;

async function launchManualBrowser(extensionPath, profileName) {
    const profileDir = getManualProfileDir(profileName);
    const context = await chromium.launchPersistentContext(
        profileDir,
        createLaunchOptions(extensionPath)
    );

    try {
        const serviceWorker = await getExtensionServiceWorker(context);
        const extensionId = new URL(serviceWorker.url()).host;

        await openDefaultPage(context);
        logBrowserDetails(extensionPath, extensionId, profileDir);
        return context;
    } catch (error) {
        await context.close().catch(() => {});
        throw error;
    }
}

function createManualBrowserSession(enabled, extensionPath, profileName) {
    let launchPromise;

    return {
        start(onClose, onError) {
            if (!enabled || launchPromise) return;

            launchPromise = launchManualBrowser(extensionPath, profileName);
            launchPromise.then((context) => context.once("close", onClose), onError);
        },
        async close() {
            if (!launchPromise) return;

            const context = await launchPromise.catch(() => null);
            await context?.close().catch(() => {});
        },
    };
}

async function runManualBrowser(extensionPath, profileName) {
    const context = await launchManualBrowser(extensionPath, profileName);
    await waitForBrowserClose(context);
}

function waitForBrowserClose(context) {
    return new Promise((resolve, reject) => {
        const closeBrowser = () => context.close().catch(reject);
        const handleClose = () => {
            process.off("SIGINT", closeBrowser);
            process.off("SIGTERM", closeBrowser);
            resolve();
        };

        process.once("SIGINT", closeBrowser);
        process.once("SIGTERM", closeBrowser);
        context.once("close", handleClose);
    });
}

function getManualProfileDir(profileName) {
    return path.join(MANUAL_PROFILE_ROOT, profileName);
}

function createLaunchOptions(extensionPath) {
    return {
        channel: "chromium",
        headless: false,
        viewport: null,
        args: [
            `--disable-extensions-except=${extensionPath}`,
            `--load-extension=${extensionPath}`,
            "--start-maximized",
        ],
    };
}

async function getExtensionServiceWorker(context) {
    const [existingServiceWorker] = context.serviceWorkers();
    if (existingServiceWorker) return existingServiceWorker;

    return await context.waitForEvent("serviceworker", { timeout: SERVICE_WORKER_TIMEOUT });
}

async function openDefaultPage(context) {
    const existingProjectPage = context
        .pages()
        .find((candidate) => candidate.url().startsWith(DEFAULT_PAGE_URL));
    if (existingProjectPage) {
        await existingProjectPage.bringToFront();
        return;
    }

    const page = context.pages().find((candidate) => candidate.url() === "about:blank");
    const targetPage = page || (await context.newPage());

    try {
        await targetPage.goto(DEFAULT_PAGE_URL, {
            timeout: PAGE_NAVIGATION_TIMEOUT,
            waitUntil: "domcontentloaded",
        });
    } catch (error) {
        console.warn(`Could not open ${DEFAULT_PAGE_URL}: ${error.message}`);
    }
}

function logBrowserDetails(extensionPath, extensionId, profileDir) {
    console.log(`Manual browser profile: ${profileDir}`);
    console.log(`Loaded extension: ${extensionPath}`);
    console.log(`Extension ID: ${extensionId}`);
    console.log(`Opened page: ${DEFAULT_PAGE_URL}`);
    console.log("Close the browser or press Ctrl+C to stop the browser session.");
}

module.exports = {
    DEFAULT_PAGE_URL,
    createManualBrowserSession,
    getManualProfileDir,
    launchManualBrowser,
    runManualBrowser,
};
