import path from "path";

const OcrDbName = "keyval-store";
const OcrStoreName = "keyval";
const OcrCachePath = "edge_translate_ocr";
const OcrUploadInputId = "edge-translate-e2e-ocr-upload-input";

describe("OCR screenshot translation", () => {
    test("Screenshot translate opens OCR settings when no OCR package is available.", async () => {
        await resetOcrState({ enabledLanguages: ["eng"] });

        const mainHandle = await driver.getWindowHandle();
        const previousOptionsTargets = await getOptionsPageTargets();
        await driver.openNewPage(`${driver.extensionUrl}/popup/popup.html`);
        await driver.clickElement("#screenshot-translate");
        await switchToExistingWindow(mainHandle);

        await expectNewOcrSettingsTarget(previousOptionsTargets);
    });

    test("OCR package upload marks the language downloaded and enabled.", async () => {
        await resetOcrState({ enabledLanguages: ["eng"] });
        await openOcrSettingsPage();
        await patchFileInputClickForUpload();

        await clickOcrAction("eng", "upload");
        await driver.clickElement(".ocr-upload-dialog-choose");
        const input = await driver.waitForSelector(`#${OcrUploadInputId}`);
        await input.sendKeys(path.resolve(__dirname, "../fixtures/ocr/eng.traineddata"));

        await driver.wait(async () => {
            const state = await readOcrLanguageState("eng");
            return state.downloaded && state.enabled;
        }, 5000);

        const cardText = await getOcrLanguageCardText("eng");
        expect(cardText).toContain("Downloaded");
        expect(cardText).toContain("Disable");
    });

    test("Screenshot translate does not open OCR settings when a package is available.", async () => {
        await resetOcrState({ enabledLanguages: ["eng"], cachedLanguages: ["eng"] });
        const state = await readOcrLanguageState("eng");
        expect(state.downloaded).toBe(true);
        expect(state.enabled).toBe(true);

        const mainHandle = await driver.getWindowHandle();
        const previousOptionsTargets = await getOptionsPageTargets();
        await driver.openNewPage(`${driver.extensionUrl}/popup/popup.html`);
        await driver.clickElement("#screenshot-translate");
        await switchToExistingWindow(mainHandle);
        await driver.delay(800);

        const targets = await getOptionsPageTargets();
        const previousTargetIds = new Set(previousOptionsTargets.map((target) => target.targetId));
        const openedOcrSettings = targets.some(
            (target) =>
                !previousTargetIds.has(target.targetId) &&
                target.url?.includes("/options/options.html#ocr-settings")
        );
        expect(openedOcrSettings).toBe(false);
    });
});

async function openOcrSettingsPage() {
    await driver.get(`${driver.extensionUrl}/options/options.html#ocr-settings`);
    await driver.waitForSelector("#ocr-download-manager .ocr-download-list");
}

async function resetOcrState({ enabledLanguages = [], cachedLanguages = [] } = {}) {
    await driver.get(`${driver.extensionUrl}/options/options.html`);
    const result = await driver.executeAsyncScript(
        (config, done) => {
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
                done({ error: openRequest.error?.message || "Failed to open OCR cache DB." });
            };
            openRequest.onsuccess = () => {
                const db = openRequest.result;
                const transaction = db.transaction(storeName, "readwrite");
                const store = transaction.objectStore(storeName);
                store.clear();
                nextCachedLanguages.forEach((language) => {
                    store.put(new Uint8Array([1, 2, 3]), `${cachePath}/${language}.traineddata`);
                });
                transaction.oncomplete = () => {
                    db.close();
                    chrome.storage.sync.set(
                        { OCRSettings: { EnabledLanguages: nextEnabledLanguages } },
                        () => done({ ok: true })
                    );
                };
                transaction.onerror = () => {
                    db.close();
                    done({ error: transaction.error?.message || "Failed to reset OCR cache." });
                };
            };
        },
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

async function patchFileInputClickForUpload() {
    await driver.executeScript((inputId) => {
        if (window.__edgeTranslateOcrUploadPatched) return;
        window.__edgeTranslateOcrUploadPatched = true;

        const originalClick = HTMLInputElement.prototype.click;
        HTMLInputElement.prototype.click = function patchedClick(...args) {
            if (this.type !== "file") {
                return originalClick.apply(this, args);
            }

            this.id = inputId;
            Object.assign(this.style, {
                position: "fixed",
                left: "0",
                top: "0",
                zIndex: "2147483647",
            });
            if (!this.parentNode) document.body.appendChild(this);
        };
    }, OcrUploadInputId);
}

async function clickOcrAction(language, action) {
    await driver.clickElement(`[data-ocr-language="${language}"] [data-ocr-action="${action}"]`);
}

async function getOcrLanguageCardText(language) {
    const card = await driver.findElement(`[data-ocr-language="${language}"]`);
    return await card.getText();
}

async function readOcrLanguageState(language) {
    return await driver.executeAsyncScript(
        (config, done) => {
            const { cachePath, dbName, storeName, targetLanguage } = config;
            chrome.storage.sync.get("OCRSettings", (storage) => {
                const openRequest = indexedDB.open(dbName);

                openRequest.onupgradeneeded = () => {
                    const db = openRequest.result;
                    if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName);
                };
                openRequest.onerror = () => {
                    done({
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
                        done({
                            downloaded: Boolean(request.result),
                            enabled: enabledLanguages.includes(targetLanguage),
                        });
                    };
                    request.onerror = () => {
                        db.close();
                        done({
                            downloaded: false,
                            enabled: false,
                            error: request.error?.message,
                        });
                    };
                };
            });
        },
        {
            cachePath: OcrCachePath,
            dbName: OcrDbName,
            storeName: OcrStoreName,
            targetLanguage: language,
        }
    );
}

async function expectNewOcrSettingsTarget(previousTargets) {
    const previousTargetIds = new Set(previousTargets.map((target) => target.targetId));
    await driver.wait(async () => {
        const targets = await getOptionsPageTargets();
        return targets.some(
            (target) =>
                !previousTargetIds.has(target.targetId) &&
                target.url?.includes("/options/options.html#ocr-settings")
        );
    }, 5000);
}

async function switchToExistingWindow(preferredHandle) {
    const handles = await driver.getAllWindowHandles();
    const nextHandle = handles.includes(preferredHandle) ? preferredHandle : handles[0];
    if (nextHandle) await driver.switchToWindow(nextHandle);
}

async function getOptionsPageTargets() {
    const result = await driver.driver.sendAndGetDevToolsCommand("Target.getTargets");
    return (result?.targetInfos || []).filter((target) =>
        target.url?.includes("/options/options.html")
    );
}
