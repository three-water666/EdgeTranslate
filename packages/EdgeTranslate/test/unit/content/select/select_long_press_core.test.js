import { getLongPressRangeFromPoint } from "content/select/select_long_press_core.js";

const Point = { x: 40, y: 30 };
const DefaultRect = {
    left: 0,
    top: 0,
    width: 600,
    height: 300,
};

describe("long press range selection", () => {
    afterEach(() => {
        document.body.replaceChildren();
        delete document.caretRangeFromPoint;
        jest.restoreAllMocks();
    });

    it("selects a short standalone div instead of the surrounding page block", () => {
        renderPage(`
            <main>
                <h1>Release notes</h1>
                <div id="target">edge</div>
                <p>Another unrelated paragraph should not be selected.</p>
            </main>
        `);
        mockCaretAt(textNode("#target"), 1);

        expect(getSelectedText()).toBe("edge");
    });

    it("prefers the inner paragraph over a larger card container", () => {
        renderPage(`
            <article id="card">
                <h2>Translator settings</h2>
                <p id="target">edge cases need careful handling.</p>
                <p>Other card text belongs to a different block.</p>
            </article>
        `);
        mockCaretAt(textNode("#target"), 2);

        expect(getSelectedText()).toBe("edge cases need careful handling.");
    });

    it("selects only tweet body text without author and media siblings", () => {
        renderPage(`
            <article data-testid="tweet">
                <div>
                    <span>Author Name</span>
                    <span>@author</span>
                </div>
                <div id="target" data-testid="tweetText">
                    <span>edge tweet body should stay selected.</span>
                </div>
                <figure>
                    <img alt="media text should not be selected" />
                    <figcaption>image caption should not be selected</figcaption>
                </figure>
                <div role="group">
                    <button>Reply</button>
                    <button>Like</button>
                </div>
            </article>
        `);
        mockCaretAt(textNode("#target"), 2);

        expect(getSelectedText()).toBe("edge tweet body should stay selected.");
    });

    it("selects the whole long tweet body without author and media siblings", () => {
        const intro = "Alpha sentence keeps the first context short.";
        const target = "Bravo sentence is the target edge body text and should stay selected.";
        const filler = "Filler sentence makes this tweet body too long. ".repeat(12);
        const distant = "Distant sentence still belongs to the same tweet body.";
        const bodyText = `${intro} ${target} ${filler} ${distant}`;

        renderPage(`
            <article data-testid="tweet">
                <div>
                    <span>Author Name</span>
                    <span>@author</span>
                </div>
                <div id="target" data-testid="tweetText">
                    ${intro}
                    <span id="hit">${target}</span>
                    ${filler}
                    ${distant}
                </div>
                <figure>
                    <figcaption>image caption should not be selected</figcaption>
                </figure>
                <div role="group">
                    <button>Reply</button>
                </div>
            </article>
        `);
        mockCaretAt(textNode("#hit"), 8);

        const selectedText = normalizeText(getSelectedText());
        expect(selectedText).toBe(normalizeText(bodyText));
        expect(selectedText).not.toContain("Author Name");
        expect(selectedText).not.toContain("image caption");
        expect(selectedText).not.toContain("Reply");
    });

    it("selects the whole direct paragraph even when it is long", () => {
        const first = "Alpha sentence keeps the first context short.";
        const second = "Bravo sentence is the target and should stay selected.";
        const third = "Charlie sentence adds nearby context for the chunk.";
        const fourth = "Delta sentence is far enough away that it should not be needed.";
        const filler = " ".repeat(5) + "Filler sentence makes this paragraph too long. ".repeat(12);
        const expectedText = `${first} ${second} ${third} ${fourth}${filler}`;

        renderPage(`<p id="target">${first} ${second} ${third} ${fourth}${filler}</p>`);
        mockCaretAt(textNode("#target"), first.length + 8);

        expect(normalizeText(getSelectedText())).toBe(normalizeText(expectedText));
    });

    it("ignores text inside controls", () => {
        renderPage("<button id='target'>edge</button>");
        mockCaretAt(textNode("#target"), 1);

        expect(getSelectedText()).toBe("");
    });

    it("does not include trailing hidden text in a direct text block", () => {
        renderPage(`
            <div id="target">
                edge
                <span style="display: none">hidden text</span>
            </div>
        `);
        mockCaretAt(textNode("#target"), 1);

        expect(getSelectedText()).toBe("edge");
    });

    it("ignores extension UI text", () => {
        renderPage("<div id='edge-translate-root'><span id='target'>edge</span></div>");
        mockCaretAt(textNode("#target"), 1);

        expect(getSelectedText()).toBe("");
    });
});

function renderPage(html) {
    document.body.innerHTML = html;
    setRect(document.documentElement);
    setRect(document.body);
    document.querySelectorAll("*").forEach((element) => setRect(element));
}

function textNode(selector) {
    const element = document.querySelector(selector);
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            return node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        },
    });
    const node = walker.nextNode();
    if (!node) throw new Error(`No text node found for selector: ${selector}`);
    return node;
}

function mockCaretAt(node, offset) {
    document.caretRangeFromPoint = jest.fn(() => {
        const range = document.createRange();
        range.setStart(node, offset);
        range.collapse(true);
        return range;
    });
}

function getSelectedText() {
    return getLongPressRangeFromPoint(Point.x, Point.y)?.toString().trim() || "";
}

function normalizeText(text) {
    return text.replace(/\s+/g, " ").trim();
}

function setRect(element, rect = DefaultRect) {
    element.getBoundingClientRect = jest.fn(() => ({
        ...rect,
        right: rect.left + rect.width,
        bottom: rect.top + rect.height,
    }));
}
