const { expect, test } = require("../playwright/fixtures");
const {
    expectNewPageWithUrl,
    expectPanelContains,
    expectVisualSnapshot,
    hasPanel,
    selectElementText,
    setOption,
    withOption,
} = require("../playwright/helpers");

const SelectionButtonId = "edge-translate-button";
const Text = "edge";

test.describe("panel resize", () => {
    test("Resize page after panel showing.", async ({ extension, mainPageUrl, page }, testInfo) => {
        await withOption(page, extension.extensionUrl, "#Resize", async () => {
            await openPanelFromSelectedText(page, mainPageUrl);
            await expectBodyWidthBelowFullPage(page);
            await expectVisualSnapshot(page, testInfo, "resize-page-enabled.png");

            await setOption(page, extension.extensionUrl, "#Resize", false);
            await openPanelFromSelectedText(page, mainPageUrl);
            await expectBodyWidthAtFullPage(page);
            await expectVisualSnapshot(page, testInfo, "resize-page-disabled.png");
        });
    });
});

test.describe("panel actions", () => {
    test("Click icon to pin panel.", async ({ mainPageUrl, page }, testInfo) => {
        const panel = await openPanelFromSelectedText(page, mainPageUrl);
        const pinIcon = await expectPanelIcon(panel, "PinIcon");
        await expectVisualSnapshot(pinIcon, testInfo, "pin-icon-unpinned-before.png");

        await pinIcon.click();
        await expectVisualSnapshot(pinIcon, testInfo, "pin-icon-pinned.png");
        await page.locator(`#${Text}`).click();
        await expect.poll(async () => await hasPanel(page)).toBe(true);

        await pinIcon.click();
        await expectVisualSnapshot(pinIcon, testInfo, "pin-icon-unpinned-after.png");
        await page.locator(`#${Text}`).click();
        await expect.poll(async () => await hasPanel(page)).toBe(false);
    });

    test("Click icon to open settings.", async ({ extension, mainPageUrl, page }) => {
        const panel = await openPanelFromSelectedText(page, mainPageUrl);
        const settingIcon = await expectPanelIcon(panel, "SettingIcon");
        const previousPages = new Set(extension.context.pages());

        await settingIcon.click();
        await expectNewPageWithUrl(extension.context, previousPages, "/options/options.html");
    });
});

test.describe("panel layout", () => {
    test("Display content from right to left.", async ({
        extension,
        mainPageUrl,
        page,
    }, testInfo) => {
        await withOption(page, extension.extensionUrl, "#RTL", async () => {
            const panel = await openPanelFromSelectedText(page, mainPageUrl);
            await expect(panel.locator("[dir='rtl']").first()).toBeVisible();
            await expectVisualSnapshot(page, testInfo, "rtl-page.png");
        });
    });
});

async function openPanelFromSelectedText(page, mainPageUrl) {
    await page.goto(mainPageUrl);
    await selectElementText(page, `#${Text}`);

    const selectionButton = page.locator(`#${SelectionButtonId}`);
    await expect(selectionButton).toBeVisible();
    await selectionButton.click();

    return await expectPanelContains(page, Text, "边缘");
}

async function expectPanelIcon(panel, testId) {
    await expect(panel).toContainText("边缘");
    const icon = panel.locator(`[data-testid="${testId}"]`);
    await expect(icon).toBeVisible();
    return icon;
}

async function getBodyWidthPercent(page) {
    return await page.evaluate(() => {
        const inlineWidth = Number.parseFloat(document.body.style.width);
        return Number.isFinite(inlineWidth) ? inlineWidth : 100;
    });
}

async function expectBodyWidthBelowFullPage(page) {
    await expect.poll(async () => await getBodyWidthPercent(page)).toBeLessThan(100);
}

async function expectBodyWidthAtFullPage(page) {
    await expect.poll(async () => await getBodyWidthPercent(page)).toBe(100);
}
