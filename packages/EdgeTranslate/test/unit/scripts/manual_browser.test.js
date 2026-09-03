const path = require("path");
const { chromium } = require("@playwright/test");
const {
    DEFAULT_PAGE_URL,
    getManualProfileDir,
    launchManualBrowser,
} = require("../../../scripts/manual-browser");

jest.mock("@playwright/test", () => ({
    chromium: {
        launchPersistentContext: jest.fn(),
    },
}));

describe("manual browser launcher", () => {
    let context;
    let page;
    let serviceWorker;

    beforeEach(() => {
        page = {
            bringToFront: jest.fn().mockResolvedValue(),
            goto: jest.fn().mockResolvedValue(),
            url: jest.fn().mockReturnValue("about:blank"),
        };
        serviceWorker = {
            url: jest.fn().mockReturnValue("chrome-extension://extension-id/background.js"),
        };
        context = {
            close: jest.fn().mockResolvedValue(),
            newPage: jest.fn().mockResolvedValue(page),
            pages: jest.fn().mockReturnValue([page]),
            serviceWorkers: jest.fn().mockReturnValue([serviceWorker]),
            waitForEvent: jest.fn(),
        };
        chromium.launchPersistentContext.mockResolvedValue(context);
        jest.spyOn(console, "log").mockImplementation(() => {});
        jest.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test("launches headed Chromium with the development extension", async () => {
        const extensionPath = path.resolve("project", "dev", "chrome");
        const profileDir = path.resolve(__dirname, "../../../dev/browser-profiles/development");

        await expect(launchManualBrowser(extensionPath, "development")).resolves.toBe(context);

        expect(chromium.launchPersistentContext).toHaveBeenCalledWith(profileDir, {
            channel: "chromium",
            headless: false,
            viewport: null,
            args: [
                `--disable-extensions-except=${extensionPath}`,
                `--load-extension=${extensionPath}`,
                "--start-maximized",
            ],
        });
        expect(page.goto).toHaveBeenCalledWith(DEFAULT_PAGE_URL, {
            timeout: 30_000,
            waitUntil: "domcontentloaded",
        });
        expect(getManualProfileDir("production")).toBe(
            path.resolve(__dirname, "../../../dev/browser-profiles/production")
        );
    });

    test("waits for the service worker and creates a page when needed", async () => {
        context.pages.mockReturnValue([]);
        context.serviceWorkers.mockReturnValue([]);
        context.waitForEvent.mockResolvedValue(serviceWorker);

        await launchManualBrowser(path.resolve("project", "dev", "chrome"), "development");

        expect(context.waitForEvent).toHaveBeenCalledWith("serviceworker", { timeout: 15_000 });
        expect(context.newPage).toHaveBeenCalledTimes(1);
        expect(page.goto).toHaveBeenCalledWith(DEFAULT_PAGE_URL, expect.any(Object));
    });

    test("reuses a project page opened by the production extension", async () => {
        page.url.mockReturnValue(`${DEFAULT_PAGE_URL}/`);

        await launchManualBrowser(path.resolve("project", "build", "chrome"), "production");

        expect(page.bringToFront).toHaveBeenCalledTimes(1);
        expect(page.goto).not.toHaveBeenCalled();
        expect(context.newPage).not.toHaveBeenCalled();
    });
});
