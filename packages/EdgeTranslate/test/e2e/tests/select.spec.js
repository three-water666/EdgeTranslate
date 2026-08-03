const { expect, test } = require("../playwright/fixtures");
const {
    expectPanelContains,
    expectVisualSnapshot,
    getPanelText,
    selectElementText,
    withOption,
} = require("../playwright/helpers");

const SelectionButtonId = "edge-translate-button";
const WaitLongPressPreviewTimeout = 440;
const WaitLongPressTranslateTime = 550;
const LongPressTextId = "edge-long-press";
const LongPressLinkId = "edge-long-press-link";
const LongPressTweetTextId = "edge-long-press-tweet-text";
const LongPressTweetTargetId = "edge-long-press-tweet-target";
const LongPressHighlightId = "edge-translate-long-press-highlight";
const Text = "edge";

test.describe("selection button", () => {
    test("Selection button shows once a text is selected.", async ({
        mainPageUrl,
        page,
    }, testInfo) => {
        await openMainPage(page, mainPageUrl);
        await selectText(page);
        const selectionButton = await expectSelectionButton(page);
        await expectVisualSnapshot(
            selectionButton,
            testInfo,
            "selection-button-after-selection.png"
        );
    });

    test("Double click text to show translation button.", async ({
        mainPageUrl,
        page,
    }, testInfo) => {
        await openMainPage(page, mainPageUrl);
        await doubleClickText(page);
        const selectionButton = await expectSelectionButton(page);
        await expectVisualSnapshot(
            selectionButton,
            testInfo,
            "selection-button-after-double-click.png"
        );
    });
});

test.describe("selection translation", () => {
    test("Start to translate once a text is selected.", async ({
        extension,
        mainPageUrl,
        page,
    }, testInfo) => {
        await withOption(page, extension.extensionUrl, "#translate-after-select", async () => {
            await openMainPage(page, mainPageUrl);
            await selectText(page);
            const panel = await expectTranslatedPanel(page);
            await expectVisualSnapshot(panel, testInfo, "translation-panel-after-selection.png");
            await expectSelectedText(page, Text);
        });
    });

    test("Cancel text selection after translation.", async ({ extension, mainPageUrl, page }) => {
        await withOption(page, extension.extensionUrl, "#cancel-text-selection", async () => {
            await openMainPage(page, mainPageUrl);
            await selectText(page);
            await clickSelectionButton(page);
            await expectPanelContains(page, Text, "边缘");
            await expectSelectedText(page, "");
        });
    });

    test("Double click text to translate directly.", async ({
        extension,
        mainPageUrl,
        page,
    }, testInfo) => {
        await withOption(page, extension.extensionUrl, "#translate-after-dbl-click", async () => {
            await openMainPage(page, mainPageUrl);
            await doubleClickText(page);
            const panel = await expectTranslatedPanel(page);
            await expectVisualSnapshot(panel, testInfo, "translation-panel-after-double-click.png");
            await expectSelectedText(page, Text);
        });
    });

    test("Long press text to translate directly.", async ({
        extension,
        mainPageUrl,
        page,
    }, testInfo) => {
        await withOption(page, extension.extensionUrl, "#translate-after-long-press", async () => {
            await openMainPage(page, mainPageUrl);
            await addLongPressTarget(page);
            const point = await startLongPress(page, `#${LongPressTextId}`);
            await expectLongPressHighlight(page, true);
            await finishLongPress(page, point);
            await expectSelectedText(page, Text);
            await expectLongPressHighlight(page, false);
            const panel = await expectTranslatedPanel(page);
            await expectVisualSnapshot(panel, testInfo, "translation-panel-after-long-press.png");
        });
    });

    test("Move cancels long press translation.", async ({ extension, mainPageUrl, page }) => {
        await withOption(page, extension.extensionUrl, "#translate-after-long-press", async () => {
            await openMainPage(page, mainPageUrl);
            await addLongPressTarget(page);
            await moveDuringLongPress(page);
            await expectSelectedText(page, "");
            await expectLongPressHighlight(page, false);
            await expectPanelNotContaining(page, "边缘");
        });
    });

    test("Long press translation prevents the following page click.", async ({
        extension,
        mainPageUrl,
        page,
    }) => {
        await withOption(page, extension.extensionUrl, "#translate-after-long-press", async () => {
            await openMainPage(page, mainPageUrl);
            await addLongPressLinkTarget(page);
            await longPressText(page, `#${LongPressLinkId}`);
            await expectSelectedText(page, Text);
            await expectPanelContains(page, Text, "边缘");
            expect(await getLongPressLinkClickCount(page)).toBe(0);
        });
    });

    test("Long press tweet-like body without selecting author or media.", async ({
        extension,
        mainPageUrl,
        page,
    }) => {
        await withOption(page, extension.extensionUrl, "#translate-after-long-press", async () => {
            await openMainPage(page, mainPageUrl);
            await addShortTweetTarget(page);
            await longPressText(page, `#${LongPressTweetTextId}`);
            await expectSelectedText(page, Text);
            await expectPanelContains(page, Text, "边缘");
            await expectSelectedTextNotContaining(page, "Author Name");
            await expectSelectedTextNotContaining(page, "image caption");
            await expectSelectedTextNotContaining(page, "Reply");
        });
    });

    test("Long press long tweet-like body selects the whole body without siblings.", async ({
        extension,
        mainPageUrl,
        page,
    }) => {
        await withOption(page, extension.extensionUrl, "#translate-after-long-press", async () => {
            await openMainPage(page, mainPageUrl);
            const fixture = await addLongTweetTarget(page);
            await longPressText(page, `#${LongPressTweetTargetId}`);

            await expectSelectedTextContaining(page, fixture.intro);
            await expectSelectedTextContaining(page, fixture.targetSentence);
            await expectSelectedTextContaining(page, fixture.fillerSentence);
            await expectSelectedTextContaining(page, fixture.distantSentence);
            await expectSelectedTextNotContaining(page, fixture.author);
            await expectSelectedTextNotContaining(page, fixture.mediaCaption);
            await expectSelectedTextNotContaining(page, fixture.actionText);
        });
    });
});

async function openMainPage(page, mainPageUrl) {
    await page.goto(mainPageUrl);
}

async function selectText(page) {
    const textElement = page.locator(`#${Text}`);
    await expect(textElement).toHaveText(Text);
    await selectElementText(page, `#${Text}`);
    await expectSelectedText(page, Text);
}

async function doubleClickText(page) {
    const textElement = page.locator(`#${Text}`);
    await expect(textElement).toHaveText(Text);
    await textElement.dblclick();
    await expectSelectedText(page, Text);
}

async function longPressText(page, selector) {
    const point = await startLongPress(page, selector);
    await finishLongPress(page, point);
}

async function startLongPress(page, selector) {
    const point = await getElementCenter(page, selector);
    await dispatchMouseEvent(page, "mousedown", point, { buttons: 1 });
    return point;
}

async function finishLongPress(page, point) {
    await page.waitForTimeout(WaitLongPressTranslateTime);
    await dispatchMouseEvent(page, "mouseup", point);
    await dispatchMouseEvent(page, "click", point);
}

async function moveDuringLongPress(page) {
    const startPoint = await startLongPress(page, `#${LongPressTextId}`);
    await expectLongPressHighlight(page, true);

    const movedPoint = { x: startPoint.x + 16, y: startPoint.y };
    await dispatchMouseEvent(page, "mousemove", movedPoint, { buttons: 1 });
    await finishLongPress(page, movedPoint);
}

async function getElementCenter(page, selector) {
    const boundingBox = await page.locator(selector).boundingBox();
    if (!boundingBox) throw new Error(`Unable to find a bounding box for ${selector}`);

    return {
        x: boundingBox.x + boundingBox.width / 2,
        y: boundingBox.y + boundingBox.height / 2,
    };
}

async function dispatchMouseEvent(page, type, point, options = {}) {
    await page.evaluate(
        ({ eventOptions, eventType, eventPoint }) => {
            const target = document.elementFromPoint(eventPoint.x, eventPoint.y);
            if (!target) throw new Error(`No element found at ${eventPoint.x},${eventPoint.y}`);

            target.dispatchEvent(
                new MouseEvent(eventType, {
                    bubbles: true,
                    cancelable: true,
                    button: 0,
                    buttons: 0,
                    clientX: eventPoint.x,
                    clientY: eventPoint.y,
                    ...eventOptions,
                })
            );
        },
        { eventOptions: options, eventType: type, eventPoint: point }
    );
}

async function addLongPressTarget(page) {
    await page.evaluate(
        ({ targetId, text }) => {
            const list = document.createElement("ul");
            const item = document.createElement("li");
            item.id = targetId;
            item.textContent = text;
            list.appendChild(item);
            document.body.appendChild(list);
        },
        { targetId: LongPressTextId, text: Text }
    );
}

async function addLongPressLinkTarget(page) {
    await page.evaluate(
        ({ targetId, text }) => {
            window.edgeTranslateLongPressClickCount = 0;
            const paragraph = document.createElement("p");
            const link = document.createElement("a");
            link.id = targetId;
            link.href = "#long-press-clicked";
            link.textContent = text;
            link.addEventListener("click", () => {
                window.edgeTranslateLongPressClickCount += 1;
            });
            paragraph.appendChild(link);
            document.body.appendChild(paragraph);
        },
        { targetId: LongPressLinkId, text: Text }
    );
}

async function addShortTweetTarget(page) {
    await page.evaluate(
        ({ targetId, text }) => {
            function createTextElement(tagName, id, elementText = "") {
                const element = document.createElement(tagName);
                if (id) element.id = id;
                element.textContent = elementText;
                return element;
            }

            const tweet = document.createElement("article");
            Object.assign(tweet.style, {
                display: "block",
                width: "520px",
                padding: "16px",
                margin: "24px",
                border: "1px solid #ddd",
            });

            const body = createTextElement("div", targetId, text);
            Object.assign(body.style, { display: "block", margin: "8px 0" });
            const figure = document.createElement("figure");
            figure.appendChild(
                createTextElement("figcaption", "", "image caption should not be selected")
            );
            tweet.append(
                createTextElement("div", "", "Author Name"),
                body,
                figure,
                createTextElement("div", "", "Reply")
            );
            document.body.appendChild(tweet);
        },
        { targetId: LongPressTweetTextId, text: Text }
    );
}

async function addLongTweetTarget(page) {
    const fixture = {
        author: "Author Name",
        intro: "Alpha sentence keeps the first context short.",
        targetSentence: "Bravo sentence is the target edge body text and should stay selected.",
        nearbySentence: "Charlie sentence adds nearby context for the selected body.",
        fillerSentence: "Filler sentence makes this tweet body too long.",
        mediaCaption: "image caption should not be selected",
        actionText: "Reply",
        distantSentence: "Distant sentence still belongs to the same tweet body.",
    };

    await page.evaluate(
        ({ ids, values }) => {
            function createTextElement(tagName, id, text = "") {
                const element = document.createElement(tagName);
                if (id) element.id = id;
                element.textContent = text;
                return element;
            }

            const body = createTextElement("div", ids.tweetTextId);
            Object.assign(body.style, { display: "block", margin: "8px 0" });
            body.append(values.intro, " ");

            const target = document.createElement("span");
            target.id = ids.tweetTargetId;
            target.textContent = values.targetSentence;
            body.appendChild(target);
            body.append(
                " ",
                values.nearbySentence,
                " ",
                `${values.fillerSentence} `.repeat(12),
                " ",
                values.distantSentence
            );

            const tweet = document.createElement("article");
            Object.assign(tweet.style, {
                display: "block",
                width: "520px",
                padding: "16px",
                margin: "24px",
                border: "1px solid #ddd",
            });
            const figure = document.createElement("figure");
            figure.appendChild(createTextElement("figcaption", "", values.mediaCaption));
            tweet.append(
                createTextElement("div", "", values.author),
                body,
                figure,
                createTextElement("div", "", values.actionText)
            );
            document.body.appendChild(tweet);
        },
        {
            ids: {
                tweetTextId: LongPressTweetTextId,
                tweetTargetId: LongPressTweetTargetId,
            },
            values: fixture,
        }
    );

    return fixture;
}

async function getLongPressLinkClickCount(page) {
    return await page.evaluate(() => window.edgeTranslateLongPressClickCount || 0);
}

async function clickSelectionButton(page) {
    const selectionButton = page.locator(`#${SelectionButtonId}`);
    await expect(selectionButton).toBeVisible();
    await selectionButton.click();
}

async function expectSelectionButton(page) {
    const selectionButton = page.locator(`#${SelectionButtonId}`);
    await expect(selectionButton).toBeVisible();
    return selectionButton;
}

async function expectTranslatedPanel(page) {
    return await expectPanelContains(page, Text, "边缘");
}

async function expectPanelNotContaining(page, text) {
    await page.waitForTimeout(300);
    expect(await getPanelText(page)).not.toContain(text);
}

async function expectSelectedTextContaining(page, text) {
    await expect.poll(async () => normalizeText(await getSelectedText(page))).toContain(text);
}

async function expectSelectedTextNotContaining(page, text) {
    await expect.poll(async () => normalizeText(await getSelectedText(page))).not.toContain(text);
}

async function expectLongPressHighlight(page, visible) {
    const getRectCount = async () => {
        return await page.evaluate(
            (highlightId) => document.getElementById(highlightId)?.children.length || 0,
            LongPressHighlightId
        );
    };

    if (visible) {
        await page.waitForFunction(
            (highlightId) => document.getElementById(highlightId)?.children.length > 0,
            LongPressHighlightId,
            { polling: "raf", timeout: WaitLongPressPreviewTimeout }
        );
        return;
    }

    await expect.poll(getRectCount).toBe(0);
}

async function expectSelectedText(page, text) {
    await expect.poll(async () => await getSelectedText(page)).toBe(text);
}

async function getSelectedText(page) {
    return await page.evaluate(() => window.getSelection().toString());
}

function normalizeText(text) {
    return text.replace(/\s+/g, " ").trim();
}
