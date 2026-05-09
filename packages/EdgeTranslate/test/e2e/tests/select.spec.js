import path from "path";
import {
    expectImageSnapshot,
    expectPanelContains,
    expectVisibleElement,
    withOption,
} from "../library/test_mode";

const SelectionButtonId = "edge-translate-button";
const WaitTranslationResultTime = 200; // Delayed time for waiting the response of translation result.
const WaitButtonTime = 350; // Delayed time for waiting the animation of button to finish.
const LongPressTextId = "edge-long-press";
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
        await withOption("#translate-after-select", true, async () => {
            await openMainPage();
            await selectText();
            await expectTranslatedPanelSnapshot();
            // The selected text shouldn't be canceled.
            await expectSelectedText(Text);
        });
    });

    test("Cancel text selection after translation.", async () => {
        await withOption("#cancel-text-selection", true, async () => {
            await openMainPage();
            await selectText();
            await clickSelectionButton();
            await expectPanelContains(Text, "边缘");
            // The selected text should be canceled.
            await expectSelectedText("");
        });
    });

    test("Double click text to translate directly.", async () => {
        await withOption("#translate-after-dbl-click", true, async () => {
            await openMainPage();
            await doubleClickText();
            await expectTranslatedPanelSnapshot();
            // The selected text shouldn't be canceled.
            await expectSelectedText(Text);
        });
    });

    test("Long press text to translate directly.", async () => {
        await withOption("#translate-after-long-press", true, async () => {
            await openMainPage();
            await addLongPressTarget();
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
    const point = await getElementCenter(`#${LongPressTextId}`);
    await dispatchMouseEvent("mousedown", point, { buttons: 1 });
    await driver.delay(550);
    await dispatchMouseEvent("mouseup", point);
    await dispatchMouseEvent("click", point);
    await driver.delay(WaitTranslationResultTime);
}

async function getElementCenter(selector) {
    return await driver.executeScript((selector) => {
        const rect = document.querySelector(selector).getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
        };
    }, selector);
}

async function dispatchMouseEvent(type, point, options = {}) {
    await driver.executeScript(
        (type, point, options) => {
            const target = document.elementFromPoint(point.x, point.y);
            const eventOptions = {
                bubbles: true,
                cancelable: true,
                button: 0,
                buttons: 0,
                clientX: point.x,
                clientY: point.y,
            };
            Object.assign(eventOptions, options);
            target.dispatchEvent(new MouseEvent(type, eventOptions));
        },
        type,
        point,
        options
    );
}

async function addLongPressTarget() {
    await driver.executeScript(
        (targetId, text) => {
            const list = document.createElement("ul");
            const item = document.createElement("li");
            item.id = targetId;
            item.textContent = text;
            list.appendChild(item);
            document.body.appendChild(list);
        },
        LongPressTextId,
        Text
    );
}

async function clickSelectionButton() {
    await driver.delay(WaitButtonTime);
    await driver.clickElement(`#${SelectionButtonId}`);
    await driver.delay(WaitTranslationResultTime);
}

async function expectSelectionButtonSnapshot() {
    await driver.delay(WaitButtonTime);
    const selectionButton = await expectVisibleElement(`#${SelectionButtonId}`);
    await expectImageSnapshot(() => selectionButton.takeScreenshot(true));
}

async function expectTranslatedPanelSnapshot() {
    await driver.delay(WaitTranslationResultTime);
    const panel = await expectPanelContains(Text, "边缘");
    await expectImageSnapshot(() => panel.takeScreenshot(true));
}

async function expectSelectedText(text) {
    expect(await driver.executeScript("return window.getSelection().toString();")).toBe(text);
}
