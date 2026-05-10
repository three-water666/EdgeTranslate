import path from "path";
import { By } from "selenium-webdriver";
import {
    expectImageSnapshot,
    expectPanelContains,
    setOption,
    withOption,
} from "../library/test_mode";

const SelectionButtonId = "edge-translate-button";
const WaitTranslationResultTime = 250; // Delayed time for waiting the response of translation result.
const WaitButtonTime = 350; // Delayed time for waiting the animation of button to finish.
const PageName = "main.html";
const Text = "edge";

describe("panel resize", () => {
    test("Resize page after panel showing.", async () => {
        await withOption("#Resize", true, async () => {
            await openPanelFromSelectedText();
            await driver.delay(500);
            await expectPageSnapshot();

            await driver.navigate(driver.PAGES.OPTIONS);
            await setOption("#Resize", false);

            await openPanelFromSelectedText();
            await expectPageSnapshot();
        });
    });
});

describe("panel actions", () => {
    test("Click icon to pin panel.", async () => {
        const panel = await openPanelFromSelectedText();
        const pinIcon = await expectPanelIcon(panel, "PinIcon");
        await expectElementSnapshot(pinIcon);

        await pinIcon.click();
        await driver.delay(400);
        await expectElementSnapshot(pinIcon);

        await driver.clickElement(`#${Text}`);
        expect(await driver.getPanel()).not.toBeUndefined();

        await pinIcon.click();
        await driver.delay(400);
        await expectElementSnapshot(pinIcon);

        await driver.clickElement(`#${Text}`);
        expect(await driver.getPanel()).toBeUndefined();
    });

    test("Click icon to open settings.", async () => {
        const panel = await openPanelFromSelectedText();
        const settingIcon = await expectPanelIcon(panel, "SettingIcon");
        const previousOptionsTargets = await getOptionsPageTargets();

        await clickSettingsIcon(settingIcon);
        await expectOptionsPageTarget(previousOptionsTargets);
    });
});

describe("panel layout", () => {
    test("Display content from right to left.", async () => {
        await withOption("#RTL", true, async () => {
            const panel = await openPanelFromSelectedText();
            const rtlElements = await panel.findElements(By.css("[dir='rtl']"));
            expect(rtlElements.length).toBeGreaterThan(0);
            await expectPageSnapshot();
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

async function expectPageSnapshot() {
    await expectImageSnapshot(() => driver.takeScreenshot());
}

async function expectElementSnapshot(element) {
    await expectImageSnapshot(() => element.takeScreenshot(true));
}

async function clickSettingsIcon(settingIcon) {
    await settingIcon.click();
    await driver.delay(100);
}

async function expectOptionsPageTarget(previousTargets) {
    const previousTargetIds = new Set(previousTargets.map((target) => target.targetId));
    await driver.wait(async () => {
        const targets = await getOptionsPageTargets();
        return targets.some((target) => !previousTargetIds.has(target.targetId));
    }, 5000);
}

async function getOptionsPageTargets() {
    const result = await driver.driver.sendAndGetDevToolsCommand("Target.getTargets");
    return (result.targetInfos || []).filter((target) =>
        target.url?.includes("/options/options.html")
    );
}
