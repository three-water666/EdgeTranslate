import {
    LONG_PRESS_DURATION,
    LONG_PRESS_MOVE_THRESHOLD,
    LONG_PRESS_PREVIEW_DELAY,
} from "content/select/select_constants.js";
import { createLongPressController } from "content/select/select_long_press_controller.js";

describe("long press controller", () => {
    const originalElementFromPoint = document.elementFromPoint;

    beforeEach(() => {
        jest.useFakeTimers();
        document.body.innerHTML = "";
        setViewport(1024, 768);
    });

    afterEach(() => {
        document.elementFromPoint = originalElementFromPoint;
        jest.clearAllTimers();
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    it("previews, translates, consumes mouseup, and guards the follow-up click", async () => {
        const scenario = createTranslationScenario("a", "Long press text");

        startLongPress(scenario);
        previewLongPress(scenario);
        await finishLongPressTranslation();

        expectTranslated(scenario);
        expectMouseUpConsumed(scenario);
        expectClickGuarded(scenario);
    });

    it("does not translate after a pending blacklist check if the session was canceled", async () => {
        const scenario = createPendingBlacklistScenario();

        startLongPress(scenario);
        jest.advanceTimersByTime(LONG_PRESS_DURATION);
        cancelBeforeBlacklistResolves(scenario);
        await resolveBlacklist(scenario);

        expectNoStaleTranslation(scenario);
    });

    it("cancels preview and translation when the pointer moves too far", async () => {
        const target = appendTarget("span");
        const tools = createTools({ range: createRangeStub("Moved text"), target });
        const translateSelection = jest.fn();
        const controller = createController({ tools, translateSelection });

        controller.setEnabled(true);
        controller.handleMouseDown(createMouseEvent("mousedown", target, 20, 30));
        controller.handleMouseMove(
            createMouseEvent("mousemove", target, 20 + LONG_PRESS_MOVE_THRESHOLD + 1, 30)
        );
        jest.advanceTimersByTime(LONG_PRESS_DURATION);
        await flushPromises();

        expect(tools.renderHighlight).not.toHaveBeenCalled();
        expect(translateSelection).not.toHaveBeenCalled();
        expect(tools.clearHighlight).toHaveBeenCalledTimes(1);
    });
});

function createTranslationScenario(tagName, text) {
    const target = appendTarget(tagName);
    const range = createRangeStub(text);
    const selection = mockSelection();
    const tools = createTools({ range, target });
    const translateSelection = jest.fn();
    const controller = createController({ tools, translateSelection });
    return { controller, range, selection, target, tools, translateSelection };
}

function createPendingBlacklistScenario() {
    const scenario = createTranslationScenario("button", "Stale text");
    const deferred = createDeferred();
    scenario.controller = createController({
        isInBlacklist: jest.fn(() => deferred.promise),
        tools: scenario.tools,
        translateSelection: scenario.translateSelection,
    });
    return { ...scenario, deferred };
}

function startLongPress(scenario) {
    scenario.controller.setEnabled(true);
    scenario.controller.handleMouseDown(createMouseEvent("mousedown", scenario.target, 20, 30));
}

function previewLongPress(scenario) {
    jest.advanceTimersByTime(LONG_PRESS_PREVIEW_DELAY);
    expect(scenario.tools.renderHighlight).toHaveBeenCalledWith(scenario.range);
}

async function finishLongPressTranslation() {
    jest.advanceTimersByTime(LONG_PRESS_DURATION - LONG_PRESS_PREVIEW_DELAY);
    await flushPromises();
}

function expectTranslated(scenario) {
    expect(scenario.selection.addRange).toHaveBeenCalledWith(scenario.range);
    expect(scenario.translateSelection).toHaveBeenCalledTimes(1);
    expect(scenario.tools.clearHighlight).toHaveBeenCalled();
}

function expectMouseUpConsumed(scenario) {
    const mouseupEvent = createMouseEvent("mouseup", scenario.target, 20, 30);
    scenario.controller.handleMouseUp(mouseupEvent);
    expect(mouseupEvent.preventDefault).toHaveBeenCalledTimes(1);
}

function expectClickGuarded(scenario) {
    const clickEvent = createMouseEvent("click", scenario.target, 20, 30);
    scenario.controller.handleClick(clickEvent);
    expect(clickEvent.preventDefault).toHaveBeenCalledTimes(1);
    expect(clickEvent.stopPropagation).toHaveBeenCalledTimes(1);
    expect(clickEvent.stopImmediatePropagation).toHaveBeenCalledTimes(1);
}

function cancelBeforeBlacklistResolves(scenario) {
    scenario.mouseupEvent = createMouseEvent("mouseup", scenario.target, 20, 30);
    scenario.controller.handleMouseUp(scenario.mouseupEvent);
    scenario.deferred.resolve(false);
}

async function resolveBlacklist(scenario) {
    await scenario.deferred.promise;
    await flushPromises();
}

function expectNoStaleTranslation(scenario) {
    expect(scenario.mouseupEvent.preventDefault).not.toHaveBeenCalled();
    expect(scenario.selection.addRange).not.toHaveBeenCalled();
    expect(scenario.translateSelection).not.toHaveBeenCalled();
}

function createController(options = {}) {
    return createLongPressController({
        cancelTextSelection: options.cancelTextSelection || jest.fn(),
        isInBlacklist: options.isInBlacklist || jest.fn(() => Promise.resolve(false)),
        shouldTranslate: options.shouldTranslate || jest.fn(() => true),
        translateSelection: options.translateSelection || jest.fn(),
        tools: options.tools || createTools(),
    });
}

function createTools(options = {}) {
    return {
        clearHighlight: jest.fn(),
        getActionTarget: jest.fn((target) => options.target || target),
        getRangeFromPoint: jest.fn(() => options.range || createRangeStub()),
        renderHighlight: jest.fn(),
        shouldIgnoreTarget: jest.fn(() => Boolean(options.ignoreTarget)),
    };
}

function createRangeStub(text = "Selected text") {
    const range = {
        collapsed: false,
        cloneRange: jest.fn(),
        toString: jest.fn(() => text),
    };
    range.cloneRange.mockReturnValue(range);
    return range;
}

function mockSelection(initialText = "") {
    let text = initialText;
    const selection = {
        addRange: jest.fn((range) => {
            text = range.toString();
        }),
        removeAllRanges: jest.fn(() => {
            text = "";
        }),
        toString: jest.fn(() => text),
    };
    jest.spyOn(window, "getSelection").mockReturnValue(selection);
    return selection;
}

function createMouseEvent(type, target, clientX, clientY) {
    return {
        button: 0,
        clientX,
        clientY,
        composedPath: jest.fn(() => [target]),
        preventDefault: jest.fn(),
        stopImmediatePropagation: jest.fn(),
        stopPropagation: jest.fn(),
        target,
        type,
    };
}

function appendTarget(tagName) {
    const target = document.createElement(tagName);
    document.body.appendChild(target);
    document.elementFromPoint = jest.fn(() => target);
    return target;
}

function setViewport(width, height) {
    Object.defineProperty(document.documentElement, "clientWidth", {
        configurable: true,
        value: width,
    });
    Object.defineProperty(document.documentElement, "clientHeight", {
        configurable: true,
        value: height,
    });
}

function createDeferred() {
    const deferred = {};
    deferred.promise = new Promise((resolve) => {
        deferred.resolve = resolve;
    });
    return deferred;
}

function flushPromises() {
    return Promise.resolve();
}
