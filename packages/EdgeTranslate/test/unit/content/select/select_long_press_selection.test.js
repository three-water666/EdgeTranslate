jest.mock("content/common.js", () => ({
    detectSelect: jest.fn(),
    isNativePDFViewer: jest.fn(() => true),
    isPDFjsPDFViewer: jest.fn(() => false),
}));

jest.mock("content/select/select_helpers.js", () => {
    const helpers = jest.requireActual("content/select/select_helpers.js");
    return {
        ...helpers,
        getSelection: jest.fn(() => ({
            text: global.window.getSelection().toString().trim(),
        })),
        isInBlacklist: jest.fn(() => Promise.resolve(false)),
        shouldTranslate: jest.fn(() => true),
    };
});

import { longPressStartHandler, triggerLongPressTranslate } from "content/select/select.js";

describe("long press selection lifecycle", () => {
    beforeEach(() => {
        jest.useFakeTimers();
        document.body.replaceChildren();
        window.getSelection().removeAllRanges();
    });

    afterEach(() => {
        jest.clearAllTimers();
        jest.useRealTimers();
        window.getSelection().removeAllRanges();
        jest.clearAllMocks();
    });

    it("preserves the current selection while mousedown is only a long press candidate", () => {
        const selected = appendText("selected text");
        selectNode(selected);
        const target = appendText("page menu action");
        const state = createLongPressState();

        longPressStartHandler(state, createMouseDownEvent(target));

        expect(window.getSelection().toString()).toBe("selected text");
        expect(state.longPressSession).not.toBeNull();
        expect(state.longPressSession.triggered).toBe(false);
    });

    it("replaces an existing selection after the long press is confirmed", async () => {
        const selected = appendText("stale selection");
        selectNode(selected);
        const target = appendText("new long press text");
        const targetRange = document.createRange();
        targetRange.selectNodeContents(target);
        const state = createLongPressState();
        const session = {
            moved: false,
            previewRange: targetRange,
            startX: 0,
            startY: 0,
            target,
            triggered: false,
        };

        await triggerLongPressTranslate(state, session);

        expect(window.getSelection().toString()).toBe("new long press text");
        expect(session.triggered).toBe(true);
        expect(state.channel.request).toHaveBeenCalledWith("translate", {
            text: "new long press text",
        });
    });
});

function createLongPressState() {
    return {
        channel: {
            request: jest.fn(() => ({ then: jest.fn() })),
        },
        longPressEnabled: true,
        longPressSession: null,
        tools: {
            clearHighlight: jest.fn(),
            getActionTarget: jest.fn((target) => target),
            getRangeFromPoint: jest.fn(),
            isInNativeScrollbar: jest.fn(() => false),
            renderHighlight: jest.fn(),
            shouldIgnoreTarget: jest.fn(() => false),
        },
    };
}

function createMouseDownEvent(target) {
    return {
        altKey: false,
        button: 0,
        clientX: 0,
        clientY: 0,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        target,
    };
}

function appendText(text) {
    const element = document.createElement("div");
    element.textContent = text;
    document.body.appendChild(element);
    return element;
}

function selectNode(element) {
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
}
