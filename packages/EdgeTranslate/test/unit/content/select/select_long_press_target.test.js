import { getActionTarget, shouldIgnoreTarget } from "content/select/select_long_press_target.js";

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
