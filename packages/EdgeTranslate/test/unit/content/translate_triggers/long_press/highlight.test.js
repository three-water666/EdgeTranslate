import { LONG_PRESS_HIGHLIGHT_ID } from "content/translate_triggers/shared/constants.js";
import { createLongPressHighlighter } from "content/translate_triggers/long_press/highlight/index.js";

describe("long press highlighter", () => {
    beforeEach(() => {
        document.documentElement.innerHTML = "<head></head><body></body>";
    });

    it("renders visible range rects into a managed highlight container", () => {
        const highlighter = createLongPressHighlighter();

        highlighter.render(
            createRangeStub([
                createRect({ left: 10, top: 20, width: 30, height: 12 }),
                createRect({ left: 50, top: 60, width: 0, height: 12 }),
            ])
        );

        const container = document.getElementById(LONG_PRESS_HIGHLIGHT_ID);
        expect(container).not.toBeNull();
        expect(container.children).toHaveLength(1);
        expect(container.children[0].style.left).toBe("10px");
        expect(container.children[0].style.top).toBe("20px");
        expect(container.children[0].style.width).toBe("30px");

        highlighter.clear();

        expect(document.getElementById(LONG_PRESS_HIGHLIGHT_ID)).toBeNull();
    });

    it("replaces old highlight blocks when rendering a new range", () => {
        const highlighter = createLongPressHighlighter();

        highlighter.render(createRangeStub([createRect({ left: 1, top: 1 })]));
        highlighter.render(createRangeStub([createRect({ left: 2, top: 2 })]));

        const container = document.getElementById(LONG_PRESS_HIGHLIGHT_ID);
        expect(container.children).toHaveLength(1);
        expect(container.children[0].style.left).toBe("2px");
    });
});

function createRangeStub(rects) {
    return {
        getClientRects: jest.fn(() => rects),
    };
}

function createRect({ left, top, width = 10, height = 10 }) {
    return {
        bottom: top + height,
        height,
        left,
        right: left + width,
        top,
        width,
    };
}
