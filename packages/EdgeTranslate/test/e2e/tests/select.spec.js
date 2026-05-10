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
const WaitLongPressPreviewTime = 200;
const WaitLongPressTranslateTime = 550;
const LongPressTextId = "edge-long-press";
const LongPressLinkId = "edge-long-press-link";
const LongPressTweetTextId = "edge-long-press-tweet-text";
const LongPressTweetTargetId = "edge-long-press-tweet-target";
const LongPressHighlightId = "edge-translate-long-press-highlight";
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
            const point = await startLongPress(`#${LongPressTextId}`);
            await driver.delay(WaitLongPressPreviewTime);
            await expectLongPressHighlight(true);
            await finishLongPress(point);
            await expectSelectedText(Text);
            await expectLongPressHighlight(false);
            await expectTranslatedPanelSnapshot();
        });
    });

    test("Move cancels long press translation.", async () => {
        await withOption("#translate-after-long-press", true, async () => {
            await openMainPage();
            await addLongPressTarget();
            await moveDuringLongPress();
            await expectSelectedText("");
            await expectLongPressHighlight(false);
            await expectPanelNotContaining("边缘");
        });
    });

    test("Long press translation prevents the following page click.", async () => {
        await withOption("#translate-after-long-press", true, async () => {
            await openMainPage();
            await addLongPressLinkTarget();
            await longPressText(`#${LongPressLinkId}`);
            await expectSelectedText(Text);
            await expectPanelContains(Text, "边缘");
            expect(await getLongPressLinkClickCount()).toBe(0);
        });
    });

    test("Long press tweet-like body without selecting author or media.", async () => {
        await withOption("#translate-after-long-press", true, async () => {
            await openMainPage();
            await addShortTweetTarget();
            await longPressText(`#${LongPressTweetTextId}`);
            await expectSelectedText(Text);
            await expectPanelContains(Text, "边缘");
            await expectSelectedTextNotContaining("Author Name");
            await expectSelectedTextNotContaining("image caption");
            await expectSelectedTextNotContaining("Reply");
        });
    });

    test("Long press long tweet-like body selects the whole body without siblings.", async () => {
        await withOption("#translate-after-long-press", true, async () => {
            await openMainPage();
            const fixture = await addLongTweetTarget();
            await longPressText(`#${LongPressTweetTargetId}`);

            await expectSelectedTextContaining(fixture.intro);
            await expectSelectedTextContaining(fixture.targetSentence);
            await expectSelectedTextContaining(fixture.fillerSentence);
            await expectSelectedTextContaining(fixture.distantSentence);
            await expectSelectedTextNotContaining(fixture.author);
            await expectSelectedTextNotContaining(fixture.mediaCaption);
            await expectSelectedTextNotContaining(fixture.actionText);
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

async function longPressText(selector) {
    const point = await startLongPress(selector);
    await finishLongPress(point);
}

async function startLongPress(selector) {
    const point = await getElementCenter(selector);
    await dispatchMouseEvent("mousedown", point, { buttons: 1 });
    return point;
}

async function finishLongPress(point) {
    await driver.delay(WaitLongPressTranslateTime);
    await dispatchMouseEvent("mouseup", point);
    await dispatchMouseEvent("click", point);
    await driver.delay(WaitTranslationResultTime);
}

async function moveDuringLongPress() {
    const startPoint = await startLongPress(`#${LongPressTextId}`);
    await driver.delay(WaitLongPressPreviewTime);
    await expectLongPressHighlight(true);

    const movedPoint = { x: startPoint.x + 16, y: startPoint.y };
    await dispatchMouseEvent("mousemove", movedPoint, { buttons: 1 });
    await finishLongPress(movedPoint);
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

async function addLongPressLinkTarget() {
    await driver.executeScript(
        (targetId, text) => {
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
        LongPressLinkId,
        Text
    );
}

async function addShortTweetTarget() {
    await driver.executeScript(
        (ids, text) => {
            function createTextElement(tagName, id, elementText = "") {
                const element = document.createElement(tagName);
                if (id) element.id = id;
                element.textContent = elementText;
                return element;
            }

            function createTweetLikeCard({ author, bodyNode, mediaCaption, actionText }) {
                const tweet = document.createElement("article");
                Object.assign(tweet.style, {
                    display: "block",
                    width: "520px",
                    padding: "16px",
                    margin: "24px",
                    border: "1px solid #ddd",
                });

                const authorBlock = createTextElement("div", "", author);
                const figure = document.createElement("figure");
                const caption = createTextElement("figcaption", "", mediaCaption);
                const actions = createTextElement("div", "", actionText);

                Object.assign(bodyNode.style, { display: "block", margin: "8px 0" });
                figure.appendChild(caption);
                tweet.append(authorBlock, bodyNode, figure, actions);
                return tweet;
            }

            const tweet = createTweetLikeCard({
                author: "Author Name",
                bodyNode: createTextElement("div", ids.tweetTextId, text),
                mediaCaption: "image caption should not be selected",
                actionText: "Reply",
            });
            document.body.appendChild(tweet);
        },
        {
            tweetTextId: LongPressTweetTextId,
        },
        Text
    );
}

async function addLongTweetTarget() {
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
    await driver.executeScript(
        (ids, fixture) => {
            function createTextElement(tagName, id, text = "") {
                const element = document.createElement(tagName);
                if (id) element.id = id;
                element.textContent = text;
                return element;
            }

            function createTweetLikeCard({ author, bodyNode, mediaCaption, actionText }) {
                const tweet = document.createElement("article");
                Object.assign(tweet.style, {
                    display: "block",
                    width: "520px",
                    padding: "16px",
                    margin: "24px",
                    border: "1px solid #ddd",
                });

                const authorBlock = createTextElement("div", "", author);
                const figure = document.createElement("figure");
                const caption = createTextElement("figcaption", "", mediaCaption);
                const actions = createTextElement("div", "", actionText);

                Object.assign(bodyNode.style, { display: "block", margin: "8px 0" });
                figure.appendChild(caption);
                tweet.append(authorBlock, bodyNode, figure, actions);
                return tweet;
            }

            const body = createTextElement("div", ids.tweetTextId);
            body.append(fixture.intro, " ");

            const target = document.createElement("span");
            target.id = ids.tweetTargetId;
            target.textContent = fixture.targetSentence;
            body.appendChild(target);
            body.append(
                " ",
                fixture.nearbySentence,
                " ",
                `${fixture.fillerSentence} `.repeat(12),
                " ",
                fixture.distantSentence
            );

            const tweet = createTweetLikeCard({
                author: fixture.author,
                bodyNode: body,
                mediaCaption: fixture.mediaCaption,
                actionText: fixture.actionText,
            });
            document.body.appendChild(tweet);
        },
        {
            tweetTextId: LongPressTweetTextId,
            tweetTargetId: LongPressTweetTargetId,
        },
        fixture
    );
    return fixture;
}

async function getLongPressLinkClickCount() {
    return await driver.executeScript("return window.edgeTranslateLongPressClickCount || 0;");
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

async function expectPanelNotContaining(text) {
    await driver.delay(WaitTranslationResultTime);
    expect(await getPanelText()).not.toContain(text);
}

async function expectSelectedTextContaining(text) {
    expect(normalizeText(await getSelectedText())).toContain(text);
}

async function expectSelectedTextNotContaining(text) {
    expect(normalizeText(await getSelectedText())).not.toContain(text);
}

async function getPanelText() {
    return await driver.executeScript(() => {
        const rootElement = document.querySelector("#edge-translate-root");
        const panelContainer = rootElement?.querySelector("div");
        return panelContainer?.shadowRoot?.textContent || "";
    });
}

async function expectLongPressHighlight(visible) {
    const rectCount = await driver.executeScript((highlightId) => {
        return document.getElementById(highlightId)?.children.length || 0;
    }, LongPressHighlightId);
    if (visible) expect(rectCount).toBeGreaterThan(0);
    else expect(rectCount).toBe(0);
}

async function expectSelectedText(text) {
    expect(await getSelectedText()).toBe(text);
}

async function getSelectedText() {
    return await driver.executeScript("return window.getSelection().toString();");
}

function normalizeText(text) {
    return text.replace(/\s+/g, " ").trim();
}
