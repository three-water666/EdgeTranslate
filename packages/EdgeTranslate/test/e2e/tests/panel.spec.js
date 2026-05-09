import path from "path";
import { By } from "selenium-webdriver";
import { expectImageSnapshot, expectPanelContains, toggleOption } from "../library/test_mode";

const SelectionButtonId = "edge-translate-button";
const WaitTranslationResultTime = 250; // Delayed time for waiting the response of translation result.
const WaitButtonTime = 350; // Delayed time for waiting the animation of button to finish.
const PageName = "main.html";
const Text = "edge";

describe("panel resize", () => {
    test("Resize page after panel showing.", async () => {
        await driver.navigate(driver.PAGES.OPTIONS);
        await toggleOption("#Resize");
        let resizeEnabled = true;

        try {
            await openPanelFromSelectedText();
            await driver.delay(500);
            await expectImageSnapshot(driver.takeScreenshot());

            await driver.navigate(driver.PAGES.OPTIONS);
            await toggleOption("#Resize");
            resizeEnabled = false;

            await openPanelFromSelectedText();
            await expectImageSnapshot(driver.takeScreenshot());
        } finally {
            if (resizeEnabled) {
                await driver.navigate(driver.PAGES.OPTIONS);
                await toggleOption("#Resize");
            }
        }
    });
});

describe("panel actions", () => {
    test("Click icon to pin panel.", async () => {
        const panel = await openPanelFromSelectedText();
        const pinIcon = await expectPanelIcon(panel, "PinIcon");
        await expectImageSnapshot(pinIcon.takeScreenshot(true));

        await pinIcon.click();
        await driver.delay(400);
        await expectImageSnapshot(pinIcon.takeScreenshot(true));

        await driver.clickElement(`#${Text}`);
        expect(await driver.getPanel()).not.toBeUndefined();

        await pinIcon.click();
        await driver.delay(400);
        await expectImageSnapshot(pinIcon.takeScreenshot(true));

        await driver.clickElement(`#${Text}`);
        expect(await driver.getPanel()).toBeUndefined();
    });

    test("Click icon to open settings.", async () => {
        const panel = await openPanelFromSelectedText();
        const mainPageHandle = await expectSingleMainWindow();
        const settingIcon = await expectPanelIcon(panel, "SettingIcon");

        await clickSettingsIcon(settingIcon);
        await expectWindowCount(2);
        await clickSettingsIconAgain(settingIcon, mainPageHandle);
        await closeSettingsWindow(mainPageHandle);
    });
});

describe("panel layout", () => {
    test("Display content from right to left.", async () => {
        await withOption("#RTL", async () => {
            const panel = await openPanelFromSelectedText();
            const rtlElements = await panel.findElements(By.css("[dir='rtl']"));
            expect(rtlElements.length).toBeGreaterThan(0);
            await expectImageSnapshot(driver.takeScreenshot(await driver.getPanel()));
        });
    });
});

async function openPanelFromSelectedText() {
    await driver.get(`file://${path.resolve(__dirname, "../pages", PageName)}`);
    await driver.selectElement(`#${Text}`);
    await driver.delay(WaitButtonTime);
    await driver.clickElement(`#${SelectionButtonId}`);
    await driver.delay(WaitTranslationResultTime);
    return await expectPanelContains(Text, "边缘");
}

async function expectPanelIcon(panel, testId) {
    expect(panel).not.toBeUndefined();
    expect(await panel.getText()).toContain("边缘");

    const icon = await panel.findElement(By.css(`*[data-testid="${testId}"]`));
    expect(icon).not.toBeUndefined();
    expect(await icon.isDisplayed()).toBe(true);
    return icon;
}

async function expectSingleMainWindow() {
    const mainPageHandle = await driver.getWindowHandle();
    expect(typeof mainPageHandle).toBe("string");
    await expectWindowCount(1);
    return mainPageHandle;
}

async function clickSettingsIcon(settingIcon) {
    await settingIcon.click();
    await driver.delay(100);
}

async function clickSettingsIconAgain(settingIcon, mainPageHandle) {
    await driver.switchToWindow(mainPageHandle);
    await clickSettingsIcon(settingIcon);
    await expectWindowCount(2);
}

async function closeSettingsWindow(mainPageHandle) {
    await driver.switchToWindow(-1);
    await driver.close();
    await driver.switchToWindow(mainPageHandle);
    await expectWindowCount(1);
    expect(await driver.getTitle()).toEqual(PageName);
}

async function expectWindowCount(count) {
    expect((await driver.getAllWindowHandles()).length).toEqual(count);
}

async function withOption(selector, callback) {
    await driver.navigate(driver.PAGES.OPTIONS);
    await toggleOption(selector);

    try {
        await callback();
    } finally {
        await driver.navigate(driver.PAGES.OPTIONS);
        await toggleOption(selector);
    }
}
