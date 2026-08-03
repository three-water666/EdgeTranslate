const fs = require("fs");
const http = require("http");
const path = require("path");
const { chromium, expect, test: base } = require("@playwright/test");
const mockttp = require("mockttp");
const { getBrowserLanguage, getViewport } = require("./environment");

const PACKAGE_ROOT = path.resolve(__dirname, "../../..");
const EXTENSION_PATH = path.join(PACKAGE_ROOT, "build/chrome");
const MAIN_PAGE_PATH = path.resolve(__dirname, "../pages/main.html");

const test = base.extend({
    translationProxy: [
        async ({}, use) => {
            const https = await mockttp.generateCACertificate();
            const server = mockttp.getLocal({ https });

            await server.start();
            await mockTranslationRequests(server);

            try {
                await use({ port: server.port });
            } finally {
                await server.stop();
            }
        },
        { scope: "worker" },
    ],

    extension: [
        async ({ translationProxy }, use) => {
            assertExtensionBuildExists();

            const viewport = getViewport();
            const language = getBrowserLanguage();
            const context = await chromium.launchPersistentContext("", {
                channel: "chromium",
                headless: process.env.E2E_HEADLESS !== "false",
                ignoreHTTPSErrors: true,
                locale: language,
                proxy: {
                    server: `http://127.0.0.1:${translationProxy.port}`,
                    bypass: "localhost,127.0.0.1",
                },
                viewport,
                args: [
                    `--disable-extensions-except=${EXTENSION_PATH}`,
                    `--load-extension=${EXTENSION_PATH}`,
                    "--ignore-certificate-errors",
                    `--lang=${language}`,
                    "--force-device-scale-factor=1",
                ],
            });

            try {
                const serviceWorker = await getExtensionServiceWorker(context);
                const extensionId = new URL(serviceWorker.url()).host;
                const extensionUrl = `chrome-extension://${extensionId}`;

                await applyDefaultLanguageSettings(context, extensionUrl);
                await closeAllPages(context);
                await use({ context, extensionId, extensionUrl, serviceWorker });
            } finally {
                await context.close();
            }
        },
        { scope: "worker" },
    ],

    mainPageUrl: [
        async ({}, use) => {
            const html = await fs.promises.readFile(MAIN_PAGE_PATH);
            const server = http.createServer((request, response) => {
                if (request.url === "/" || request.url === "/main.html") {
                    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
                    response.end(html);
                    return;
                }

                response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
                response.end("Not found");
            });

            await listen(server);
            const address = server.address();

            try {
                await use(`http://127.0.0.1:${address.port}/main.html`);
            } finally {
                await closeServer(server);
            }
        },
        { scope: "worker" },
    ],

    page: async ({ extension }, use) => {
        const page = await extension.context.newPage();

        try {
            await use(page);
        } finally {
            await closeAllPages(extension.context);
        }
    },
});

async function mockTranslationRequests(server) {
    await server
        .anyRequest()
        .forHost("translate.googleapis.com")
        .withQuery({
            sl: "en",
            tl: "zh-CN",
            q: "edge",
        })
        .thenFromFile(200, path.resolve(__dirname, "../fixtures/words/edge/google/en-zh-CN.json"));
}

async function getExtensionServiceWorker(context) {
    const [existingServiceWorker] = context.serviceWorkers();
    if (existingServiceWorker) return existingServiceWorker;
    return await context.waitForEvent("serviceworker", { timeout: 15_000 });
}

async function applyDefaultLanguageSettings(context, extensionUrl) {
    const page = await context.newPage();

    try {
        await page.goto(`${extensionUrl}/popup/popup.html`);
        await page.locator("#setting-switch").click();
        await page.locator("#sl").selectOption("en");
        await page.locator("#tl").selectOption("zh-CN");

        const mutualTranslate = page.locator("#mutual-translate");
        if (await mutualTranslate.isChecked()) await mutualTranslate.click();

        await expect
            .poll(async () => {
                return await page.evaluate(async () => {
                    return await chrome.storage.sync.get(["languageSetting", "OtherSettings"]);
                });
            })
            .toMatchObject({
                languageSetting: { sl: "en", tl: "zh-CN" },
                OtherSettings: { MutualTranslate: false },
            });
    } finally {
        await page.close();
    }
}

function assertExtensionBuildExists() {
    if (!fs.existsSync(path.join(EXTENSION_PATH, "manifest.json"))) {
        throw new Error(
            `Extension build not found at ${EXTENSION_PATH}. Run "pnpm build" before E2E tests.`
        );
    }
}

function listen(server) {
    return new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", () => {
            server.removeListener("error", reject);
            resolve();
        });
    });
}

function closeServer(server) {
    return new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeAllConnections?.();
    });
}

async function closeAllPages(context) {
    await Promise.all(
        context.pages().map(async (page) => {
            await page.close().catch(() => {});
        })
    );
}

module.exports = {
    expect,
    test,
};
