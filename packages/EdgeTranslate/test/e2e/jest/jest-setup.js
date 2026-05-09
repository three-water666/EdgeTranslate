const { configureToMatchImageSnapshot } = require("jest-image-snapshot");
const path = require("path");
const { Browser } = require("selenium-webdriver");
import { BROWSER_LANGUAGES_MAP } from "../../../src/common/scripts/languages";

if (process.env.E2E_TEST_MODE === "visual") {
    beforeAll(async () => {
        const [screenSize, language] = await Promise.all([
            driver.driver.manage().window().getRect(),
            driver.executeScript("return window.navigator.language"),
        ]);
        const toMatchImageSnapshot = configureToMatchImageSnapshot({
            customSnapshotsDir: path.resolve(
                __dirname,
                "../image_snapshots",
                process.env.SELENIUM_BROWSER || Browser.CHROME,
                process.platform,
                BROWSER_LANGUAGES_MAP[language] || language,
                `${screenSize.width}x${screenSize.height}`
            ),
            comparisonMethod: "ssim",
            failureThreshold: 0.01,
            failureThresholdType: "percent",
        });
        expect.extend({ toMatchImageSnapshot });
    });
}

afterEach(async () => {
    const handles = await driver.getAllWindowHandles();
    const [mainHandle, ...extraHandles] = handles;

    for (const handle of extraHandles) {
        await driver.switchToWindow(handle);
        await driver.close();
    }

    if (mainHandle) {
        await driver.switchToWindow(mainHandle);
    }
});
