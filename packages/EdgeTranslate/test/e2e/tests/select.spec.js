import path from "path";
import {
    expectImageSnapshot,
    expectPanelContains,
    expectVisibleElement,
    toggleOption,
} from "../library/test_mode";

const SelectionButtonId = "edge-translate-button";
const WaitTranslationResultTime = 200; // Delayed time for waiting the response of translation result.
const WaitButtonTime = 350; // Delayed time for waiting the animation of button to finish.
const PageName = "main.html";
const Text = "edge";

describe("selection button", () => {
    test("Selection button shows once a text is selected.", async () => {
        await openMainPage();
        await selectText();
        await expectSelectionButtonSnapshot();
    });

    test("Double click text to show translation button.", async () => {
        await openMainPage();
        await doubleClickText();
        await expectSelectionButtonSnapshot();
    });
});

describe("selection translation", () => {
    test("Start to translate once a text is selected.", async () => {
        await withOption("#translate-after-select", async () => {
            await openMainPage();
            await selectText();
            await expectTranslatedPanelSnapshot();
            // The selected text shouldn't be canceled.
            await expectSelectedText(Text);
        });
    });

    test("Cancel text selection after translation.", async () => {
        await withOption("#cancel-text-selection", async () => {
            await openMainPage();
            await selectText();
            await clickSelectionButton();
            await expectPanelContains(Text, "边缘");
            // The selected text should be canceled.
            await expectSelectedText("");
        });
    });

    test("Double click text to translate directly.", async () => {
        await withOption("#translate-after-dbl-click", async () => {
            await openMainPage();
            await doubleClickText();
            await expectTranslatedPanelSnapshot();
            // The selected text shouldn't be canceled.
            await expectSelectedText(Text);
        });
    });

    test("Long press text to translate directly.", async () => {
        await withOption("#translate-after-long-press", async () => {
            await openMainPage();
            await longPressText();
            await expectSelectedText(Text);
            await expectTranslatedPanelSnapshot();
        });
    });
});

async function openMainPage() {
    await driver.get(`file://${path.resolve(__dirname, "../pages", PageName)}`);
}

async function selectText() {
    const textEl = await driver.findElement(`#${Text}`);
    expect(await textEl.getText()).toBe(Text);

    await driver.selectElement(`#${Text}`);
    await expectSelectedText(Text);
}

async function doubleClickText() {
    const textEl = await driver.findElement(`#${Text}`);
    expect(await textEl.getText()).toBe(Text);

    const actions = driver.actions({ async: true });
    // Perform double-click action on the text.
    await actions.doubleClick(textEl).perform();
    await expectSelectedText(Text);
}

async function longPressText() {
    const textEl = await driver.findElement(`#${Text}`);
    const actions = driver.actions({ async: true });
    await actions.move({ origin: textEl }).press().pause(550).release().perform();
    await driver.delay(WaitTranslationResultTime);
}

async function clickSelectionButton() {
    await driver.delay(WaitButtonTime);
    await driver.clickElement(`#${SelectionButtonId}`);
    await driver.delay(WaitTranslationResultTime);
}

async function expectSelectionButtonSnapshot() {
    await driver.delay(WaitButtonTime);
    const selectionButton = await expectVisibleElement(`#${SelectionButtonId}`);
    await expectImageSnapshot(selectionButton.takeScreenshot(true));
}

async function expectTranslatedPanelSnapshot() {
    await driver.delay(WaitTranslationResultTime);
    const panel = await expectPanelContains(Text, "边缘");
    await expectImageSnapshot(panel.takeScreenshot(true));
}

async function expectSelectedText(text) {
    expect(await driver.executeScript("return window.getSelection().toString();")).toBe(text);
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
