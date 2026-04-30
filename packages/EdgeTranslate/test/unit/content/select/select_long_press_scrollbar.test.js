import { isInNativeScrollbar } from "content/select/select_long_press_scrollbar.js";

describe("long press scrollbar", () => {
    afterEach(() => {
        document.body.replaceChildren();
    });

    it("detects mousedown inside a native horizontal scrollbar", () => {
        const element = createScrollableElement({
            rect: { left: 10, top: 20, width: 200, height: 100 },
            clientWidth: 200,
            clientHeight: 83,
            scrollWidth: 400,
            scrollHeight: 83,
            overflowX: "auto",
            overflowY: "hidden",
        });

        expect(
            isInNativeScrollbar({
                target: element,
                clientX: 80,
                clientY: 110,
            })
        ).toBe(true);
    });

    it("does not treat the client area of a scrollable element as a scrollbar", () => {
        const element = createScrollableElement({
            rect: { left: 10, top: 20, width: 200, height: 100 },
            clientWidth: 200,
            clientHeight: 83,
            scrollWidth: 400,
            scrollHeight: 83,
            overflowX: "auto",
            overflowY: "hidden",
        });

        expect(
            isInNativeScrollbar({
                target: element,
                clientX: 80,
                clientY: 80,
            })
        ).toBe(false);
    });

    it("detects mousedown inside a native vertical scrollbar", () => {
        const element = createScrollableElement({
            rect: { left: 10, top: 20, width: 200, height: 100 },
            clientWidth: 183,
            clientHeight: 100,
            scrollWidth: 183,
            scrollHeight: 300,
            overflowX: "hidden",
            overflowY: "auto",
        });

        expect(
            isInNativeScrollbar({
                target: element,
                clientX: 205,
                clientY: 80,
            })
        ).toBe(true);
    });
});

function createScrollableElement({
    rect,
    clientWidth,
    clientHeight,
    scrollWidth,
    scrollHeight,
    overflowX,
    overflowY,
}) {
    const element = document.createElement("div");
    element.style.overflowX = overflowX;
    element.style.overflowY = overflowY;
    Object.defineProperties(element, {
        clientLeft: { configurable: true, value: 0 },
        clientTop: { configurable: true, value: 0 },
        clientWidth: { configurable: true, value: clientWidth },
        clientHeight: { configurable: true, value: clientHeight },
        scrollWidth: { configurable: true, value: scrollWidth },
        scrollHeight: { configurable: true, value: scrollHeight },
    });
    element.getBoundingClientRect = jest.fn(() => ({
        left: rect.left,
        top: rect.top,
        right: rect.left + rect.width,
        bottom: rect.top + rect.height,
        width: rect.width,
        height: rect.height,
    }));
    document.body.appendChild(element);
    return element;
}
