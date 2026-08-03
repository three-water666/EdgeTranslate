const path = require("path");
const { expect, test } = require("../playwright/fixtures");
const { expectNewPageWithUrl, openOptionsPage } = require("../playwright/helpers");

const OcrDbName = "keyval-store";
const OcrStoreName = "keyval";
const OcrCachePath = "edge_translate_ocr";

test.describe("OCR screenshot translation", () => {
    test("Screenshot translate opens OCR settings when no OCR package is available.", async ({
        extension,
        page,
    }) => {
        await resetOcrState(page, extension.extensionUrl, { enabledLanguages: ["eng"] });
        const { previousPages, popupPage } = await openScreenshotTranslatePopup(extension);

        await popupPage.locator("#screenshot-translate").click();
        await expectNewPageWithUrl(
            extension.context,
            previousPages,
            "/options/options.html#ocr-settings"
        );
    });

    test("OCR package upload marks the language downloaded and enabled.", async ({
        extension,
        page,
    }) => {
        await resetOcrState(page, extension.extensionUrl, { enabledLanguages: ["eng"] });
        await openOcrSettingsPage(page, extension.extensionUrl);

        await clickOcrAction(page, "eng", "upload");
        const fileChooserPromise = page.waitForEvent("filechooser");
        await page.locator(".ocr-upload-dialog-choose").click();
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(path.resolve(__dirname, "../fixtures/ocr/eng.traineddata"));

        await expect
            .poll(async () => await readOcrLanguageState(page, "eng"))
            .toMatchObject({ downloaded: true, enabled: true });

        const card = page.locator("[data-ocr-language=eng]");
        await expect(card).toHaveClass(/enabled/);
        await expect(card.locator("[data-ocr-action=primary]")).toHaveClass(/secondary/);
        await expect(card.locator("[data-ocr-action=upload]")).toBeDisabled();
    });

    test("Screenshot translate does not open OCR settings when a package is available.", async ({
        extension,
        page,
    }) => {
        await resetOcrState(page, extension.extensionUrl, {
            enabledLanguages: ["eng"],
            cachedLanguages: ["eng"],
        });
        await expect
            .poll(async () => await readOcrLanguageState(page, "eng"))
            .toMatchObject({ downloaded: true, enabled: true });

        const { previousPages, popupPage } = await openScreenshotTranslatePopup(extension);
        await popupPage.locator("#screenshot-translate").click();
        await page.waitForTimeout(800);

        const openedOcrSettings = extension.context
            .pages()
            .filter((candidate) => !previousPages.has(candidate))
            .some((candidate) => candidate.url().includes("/options/options.html#ocr-settings"));
        expect(openedOcrSettings).toBe(false);
    });
});

async function openScreenshotTranslatePopup(extension) {
    const popupPage = await extension.context.newPage();
    await popupPage.goto(`${extension.extensionUrl}/popup/popup.html`);
    return {
        popupPage,
        previousPages: new Set(extension.context.pages()),
    };
}

async function openOcrSettingsPage(page, extensionUrl) {
    await openOptionsPage(page, extensionUrl, "#ocr-settings");
    await expect(page.locator("#ocr-download-manager .ocr-download-list")).toBeVisible();
}

async function resetOcrState(
    page,
    extensionUrl,
    { enabledLanguages = [], cachedLanguages = [] } = {}
) {
    await openOptionsPage(page, extensionUrl);
    const result = await page.evaluate(
        (config) =>
            new Promise((resolve) => {
                const {
                    cachePath,
                    cachedLanguages: nextCachedLanguages,
                    dbName,
                    enabledLanguages: nextEnabledLanguages,
                    storeName,
                } = config;
                const openRequest = indexedDB.open(dbName);

                openRequest.onupgradeneeded = () => {
                    const db = openRequest.result;
                    if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName);
                };
                openRequest.onerror = () => {
                    resolve({
                        error: openRequest.error?.message || "Failed to open OCR cache DB.",
                    });
                };
                openRequest.onsuccess = () => {
                    const db = openRequest.result;
                    const transaction = db.transaction(storeName, "readwrite");
                    const store = transaction.objectStore(storeName);
                    store.clear();
                    nextCachedLanguages.forEach((language) => {
                        store.put(
                            new Uint8Array([1, 2, 3]),
                            `${cachePath}/${language}.traineddata`
                        );
                    });
                    transaction.oncomplete = () => {
                        db.close();
                        chrome.storage.sync.set(
                            { OCRSettings: { EnabledLanguages: nextEnabledLanguages } },
                            () => resolve({ ok: true })
                        );
                    };
                    transaction.onerror = () => {
                        db.close();
                        resolve({
                            error: transaction.error?.message || "Failed to reset OCR cache.",
                        });
                    };
                };
            }),
        {
            cachePath: OcrCachePath,
            cachedLanguages,
            dbName: OcrDbName,
            enabledLanguages,
            storeName: OcrStoreName,
        }
    );

    if (result?.error) throw new Error(result.error);
}

async function clickOcrAction(page, language, action) {
    await page.locator(`[data-ocr-language="${language}"] [data-ocr-action="${action}"]`).click();
}

async function readOcrLanguageState(page, language) {
    return await page.evaluate(
        (config) =>
            new Promise((resolve) => {
                const { cachePath, dbName, storeName, targetLanguage } = config;
                chrome.storage.sync.get("OCRSettings", (storage) => {
                    const openRequest = indexedDB.open(dbName);

                    openRequest.onupgradeneeded = () => {
                        const db = openRequest.result;
                        if (!db.objectStoreNames.contains(storeName)) {
                            db.createObjectStore(storeName);
                        }
                    };
                    openRequest.onerror = () => {
                        resolve({
                            downloaded: false,
                            enabled: false,
                            error: openRequest.error?.message,
                        });
                    };
                    openRequest.onsuccess = () => {
                        const db = openRequest.result;
                        const transaction = db.transaction(storeName, "readonly");
                        const request = transaction
                            .objectStore(storeName)
                            .get(`${cachePath}/${targetLanguage}.traineddata`);
                        request.onsuccess = () => {
                            const enabledLanguages = storage.OCRSettings?.EnabledLanguages || [];
                            db.close();
                            resolve({
                                downloaded: Boolean(request.result),
                                enabled: enabledLanguages.includes(targetLanguage),
                            });
                        };
                        request.onerror = () => {
                            db.close();
                            resolve({
                                downloaded: false,
                                enabled: false,
                                error: request.error?.message,
                            });
                        };
                    };
                });
            }),
        {
            cachePath: OcrCachePath,
            dbName: OcrDbName,
            storeName: OcrStoreName,
            targetLanguage: language,
        }
    );
}
