import {
    canStartLongPress,
    createLongPressSession,
    finishLongPressMouseUp,
    hasLongPressMoved,
    shouldPreventLongPressClick,
} from "content/select/select_long_press_events.js";

describe("long press mouse events", () => {
    beforeEach(() => {
        jest.useFakeTimers();
        document.body.replaceChildren();
        window.getSelection().removeAllRanges();
    });

    afterEach(() => {
        jest.clearAllTimers();
        jest.useRealTimers();
        window.getSelection().removeAllRanges();
    });

    it("creates a session and runs preview and translation timers", () => {
        const target = document.createElement("button");
        const range = document.createRange();
        const state = createLongPressState();
        const triggerTranslate = jest.fn();
        state.tools.getRangeFromPoint.mockReturnValue(range);

        state.longPressSession = createLongPressSession(
            state,
            createMouseEvent(target),
            triggerTranslate
        );

        expect(state.longPressSession.target).toBe(target);
        expect(state.longPressSession.initialSelection).toEqual({ ranges: [], text: "" });
        jest.advanceTimersByTime(350);
        expect(state.tools.getRangeFromPoint).toHaveBeenCalledWith(0, 0);
        expect(state.tools.renderHighlight).toHaveBeenCalledWith(range);
        jest.advanceTimersByTime(100);
        expect(triggerTranslate).toHaveBeenCalledTimes(1);
    });

    it("checks long press eligibility and movement distance", () => {
        const state = createLongPressState();
        const event = createMouseEvent(document.body);

        expect(canStartLongPress(state, event)).toBe(true);
        expect(canStartLongPress(state, { ...event, ctrlKey: true })).toBe(false);
        expect(hasLongPressMoved({ startX: 0, startY: 0 }, { clientX: 8, clientY: 0 })).toBe(false);
        expect(hasLongPressMoved({ startX: 0, startY: 0 }, { clientX: 9, clientY: 0 })).toBe(true);
    });

    it("only prevents clicks inside the active long press target", () => {
        const target = document.createElement("button");
        const child = document.createElement("span");
        target.appendChild(child);
        const state = createLongPressState();
        state.longPressPreventClickTarget = target;
        state.longPressPreventClickUntil = Date.now() + 1000;

        expect(shouldPreventLongPressClick(state, { target: child })).toBe(true);
        expect(
            shouldPreventLongPressClick(state, {
                target: document.body,
                composedPath: () => [document.body],
            })
        ).toBe(false);

        state.longPressPreventClickUntil = Date.now() - 1;
        expect(shouldPreventLongPressClick(state, { target: child })).toBe(false);
        expect(state.longPressPreventClickTarget).toBeNull();
    });

    it("lets mouseup propagate after a long press translation releases", () => {
        const state = createLongPressState({ triggered: true });
        const event = {
            button: 0,
            preventDefault: jest.fn(),
            stopPropagation: jest.fn(),
            stopImmediatePropagation: jest.fn(),
        };

        finishLongPressMouseUp(state, event);

        expect(event.preventDefault).toHaveBeenCalledTimes(1);
        expect(event.stopPropagation).not.toHaveBeenCalled();
        expect(event.stopImmediatePropagation).not.toHaveBeenCalled();
        expect(state.tools.clearHighlight).toHaveBeenCalledTimes(1);
        expect(state.longPressSession).toBeNull();
    });

    it("only consumes mouseup for triggered left-button long press sessions", () => {
        const event = {
            button: 0,
            preventDefault: jest.fn(),
        };

        finishLongPressMouseUp(createLongPressState({ triggered: false }), event);
        finishLongPressMouseUp(createLongPressState(), event);
        finishLongPressMouseUp(createLongPressState({ triggered: true }), {
            ...event,
            button: 1,
        });

        expect(event.preventDefault).not.toHaveBeenCalled();
    });
});

function createLongPressState(longPressSession = null) {
    return {
        longPressEnabled: true,
        longPressPreventClickTarget: null,
        longPressPreventClickUntil: 0,
        longPressSession,
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

function createMouseEvent(target) {
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
