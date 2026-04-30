import {
    getActionTarget,
    shouldIgnoreTarget,
} from "content/translate_triggers/long_press/target.js";

describe("long press target helpers", () => {
    beforeEach(() => {
        document.body.innerHTML = "";
    });

    it("ignores plugin UI, editable controls, and resize-like targets", () => {
        expect(shouldIgnoreTarget(null)).toBe(true);
        expect(shouldIgnoreTarget(appendElement("input"))).toBe(true);
        expect(shouldIgnoreTarget(appendElement("div", { contentEditable: "true" }))).toBe(true);
        expect(shouldIgnoreTarget(appendElement("div", { id: "edge-translate-root" }))).toBe(true);
        expect(shouldIgnoreTarget(appendElement("div", { cursor: "col-resize" }))).toBe(true);
    });

    it("allows normal text targets", () => {
        expect(shouldIgnoreTarget(appendElement("span"))).toBe(false);
    });

    it("ignores the occupied horizontal native scrollbar area", () => {
        const target = appendScrollableElement({
            clientHeight: 80,
            clientWidth: 200,
            offsetHeight: 95,
            offsetWidth: 200,
            overflowX: "auto",
            overflowY: "hidden",
            rect: { left: 10, top: 20, width: 200, height: 95 },
            scrollHeight: 80,
            scrollWidth: 500,
        });

        expect(shouldIgnoreTarget(target, createMouseEvent(target, 50, 105))).toBe(true);
        expect(shouldIgnoreTarget(target, createMouseEvent(target, 50, 90))).toBe(false);
    });

    it("ignores the occupied vertical native scrollbar area", () => {
        const target = appendScrollableElement({
            clientHeight: 80,
            clientWidth: 200,
            offsetHeight: 80,
            offsetWidth: 215,
            overflowX: "hidden",
            overflowY: "auto",
            rect: { left: 10, top: 20, width: 215, height: 80 },
            scrollHeight: 500,
            scrollWidth: 200,
        });

        expect(shouldIgnoreTarget(target, createMouseEvent(target, 215, 50))).toBe(true);
        expect(shouldIgnoreTarget(target, createMouseEvent(target, 190, 50))).toBe(false);
    });

    it("does not treat overflow hidden edges as native scrollbars", () => {
        const target = appendScrollableElement({
            clientHeight: 80,
            clientWidth: 200,
            offsetHeight: 95,
            offsetWidth: 200,
            overflowX: "hidden",
            overflowY: "hidden",
            rect: { left: 10, top: 20, width: 200, height: 95 },
            scrollHeight: 80,
            scrollWidth: 500,
        });

        expect(shouldIgnoreTarget(target, createMouseEvent(target, 50, 105))).toBe(false);
    });

    it("prefers interactive ancestors as click guard targets", () => {
        const link = appendElement("a");
        const text = document.createElement("span");
        link.appendChild(text);

        expect(getActionTarget(text)).toBe(link);
        expect(getActionTarget(appendElement("span"))).toBeInstanceOf(HTMLSpanElement);
        expect(getActionTarget(null)).toBeNull();
    });
});

function appendElement(tagName, options = {}) {
    const element = document.createElement(tagName);
    if (options.id) element.id = options.id;
    if (options.contentEditable) element.setAttribute("contenteditable", options.contentEditable);
    if (options.cursor) element.style.cursor = options.cursor;
    document.body.appendChild(element);
    return element;
}

function appendScrollableElement(options) {
    const element = appendElement("div");
    element.style.overflowX = options.overflowX;
    element.style.overflowY = options.overflowY;

    setReadonlyLayoutProperty(element, "clientHeight", options.clientHeight);
    setReadonlyLayoutProperty(element, "clientWidth", options.clientWidth);
    setReadonlyLayoutProperty(element, "offsetHeight", options.offsetHeight);
    setReadonlyLayoutProperty(element, "offsetWidth", options.offsetWidth);
    setReadonlyLayoutProperty(element, "scrollHeight", options.scrollHeight);
    setReadonlyLayoutProperty(element, "scrollWidth", options.scrollWidth);
    element.getBoundingClientRect = jest.fn(() => ({
        bottom: options.rect.top + options.rect.height,
        height: options.rect.height,
        left: options.rect.left,
        right: options.rect.left + options.rect.width,
        top: options.rect.top,
        width: options.rect.width,
    }));

    return element;
}

function setReadonlyLayoutProperty(element, property, value) {
    Object.defineProperty(element, property, {
        configurable: true,
        value,
    });
}

function createMouseEvent(target, clientX, clientY) {
    return {
        clientX,
        clientY,
        composedPath: jest.fn(() => [target, document.body, document.documentElement]),
    };
}
