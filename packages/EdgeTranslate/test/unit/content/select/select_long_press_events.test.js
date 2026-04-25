import { finishLongPressMouseUp } from "content/select/select_long_press_events.js";

describe("long press mouse events", () => {
    it("lets mouseup propagate after a long press translation releases", () => {
        const state = {
            longPressSession: {
                triggered: true,
            },
        };
        const event = {
            button: 0,
            preventDefault: jest.fn(),
            stopPropagation: jest.fn(),
            stopImmediatePropagation: jest.fn(),
        };
        const cancelLongPressSession = jest.fn((currentState) => {
            currentState.longPressSession = null;
        });

        finishLongPressMouseUp(state, event, cancelLongPressSession);

        expect(cancelLongPressSession).toHaveBeenCalledWith(state);
        expect(event.preventDefault).toHaveBeenCalledTimes(1);
        expect(event.stopPropagation).not.toHaveBeenCalled();
        expect(event.stopImmediatePropagation).not.toHaveBeenCalled();
        expect(state.longPressSession).toBeNull();
    });

    it("only consumes mouseup for triggered left-button long press sessions", () => {
        const event = {
            button: 0,
            preventDefault: jest.fn(),
        };

        finishLongPressMouseUp({ longPressSession: { triggered: false } }, event, jest.fn());
        finishLongPressMouseUp({ longPressSession: null }, event, jest.fn());
        finishLongPressMouseUp(
            { longPressSession: { triggered: true } },
            { ...event, button: 1 },
            jest.fn()
        );

        expect(event.preventDefault).not.toHaveBeenCalled();
    });
});
