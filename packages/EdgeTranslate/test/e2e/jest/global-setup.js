const path = require("path");
const net = require("net");
const mockttp = require("mockttp");

import { buildWebDriver } from "../webdriver";
import { changeLanguageSetting } from "../library/initiate.js";

module.exports = async () => {
    const { server, proxyPort } = await startTranslationProxy();
    global.server = server;
    process.server = server;

    const driver = await launchWebDriver(proxyPort);
    global.driver = driver;
    process.driver = driver;

    mockTranslationRequests(server);
    await applyDefaultLanguageSettings();
};

async function startTranslationProxy() {
    console.log("[e2e] starting local translation proxy");
    // Create a proxy server with a self-signed HTTPS CA certificate.
    const https = await mockttp.generateCACertificate();
    const server = mockttp.getLocal({ https });
    const proxyPort = await getAvailablePort(8080);
    await server.start(proxyPort);
    console.log(`[e2e] local translation proxy listening on ${proxyPort}`);
    return { server, proxyPort };
}

async function launchWebDriver(proxyPort) {
    console.log("[e2e] launching browser webdriver");
    const driver = (
        await buildWebDriver({
            proxyUrl: `localhost:${proxyPort}`,
        })
    ).driver;
    console.log("[e2e] browser webdriver launched");
    await driver.driver.manage().window().maximize();
    console.log("[e2e] browser window maximized");
    return driver;
}

function mockTranslationRequests(server) {
    const SL = "en",
        TL = "zh-CN",
        WordsList = ["edge"];
    // Mock the translation requests for the words.
    WordsList.reduce(
        (server, word) =>
            server
                .withQuery({
                    sl: SL,
                    tl: TL,
                    q: word,
                })
                .thenFromFile(
                    200,
                    path.resolve(__dirname, `../fixtures/words/${word}/google/${SL}-${TL}.json`)
                ),
        server.anyRequest().forHost("translate.googleapis.com")
    );
}

async function applyDefaultLanguageSettings() {
    console.log("[e2e] applying default extension language settings");
    await changeLanguageSetting({
        source: "en",
        target: "zh-CN",
        mutual: false,
    });
    console.log("[e2e] setup complete");
}

function getAvailablePort(startPort) {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.unref();
        server.on("error", (error) => {
            if (error.code === "EADDRINUSE") {
                getAvailablePort(startPort + 1).then(resolve, reject);
            } else {
                reject(error);
            }
        });
        server.listen(startPort, () => {
            const port = server.address().port;
            server.close(() => resolve(port));
        });
    });
}
