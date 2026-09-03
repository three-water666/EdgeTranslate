import {
    disappearButton,
    initializeButtonContainer,
    showButton,
} from "content/select/select_button.js";

describe("selection button top layer host", () => {
    let originalClose;
    let originalHidePopover;
    let originalShow;
    let originalShowModal;
    let originalShowPopover;
    let originalElementsFromPoint;

    beforeEach(() => {
        document.documentElement.innerHTML = "<head></head><body></body>";
        originalClose = HTMLDialogElement.prototype.close;
        originalHidePopover = HTMLDialogElement.prototype.hidePopover;
        originalShow = HTMLDialogElement.prototype.show;
        originalShowModal = HTMLDialogElement.prototype.showModal;
        originalShowPopover = HTMLDialogElement.prototype.showPopover;
        originalElementsFromPoint = document.elementsFromPoint;
        window.getSelection().removeAllRanges();
    });

    afterEach(() => {
        restoreDialogMethod("close", originalClose);
        restoreDialogMethod("hidePopover", originalHidePopover);
        restoreDialogMethod("show", originalShow);
        restoreDialogMethod("showModal", originalShowModal);
        restoreDialogMethod("showPopover", originalShowPopover);
        if (originalElementsFromPoint) {
            setElementsFromPoint(originalElementsFromPoint);
        } else {
            delete document.elementsFromPoint;
        }
        window.getSelection().removeAllRanges();
        jest.useRealTimers();
    });

    it("shows the button directly on normal pages", () => {
        const { showModal } = mockDialogMethods();
        const state = createButtonState();

        initializeButtonContainer(state, jest.fn());
        prepareButtonDimensions(state);
        showButton(state, createSelectionEvent());

        expect(showModal).not.toHaveBeenCalled();
        expect(document.documentElement.contains(state.translationButtonHost)).toBe(false);
        expect(document.documentElement.contains(state.translationButtonContainer)).toBe(true);
        expect(state.translationButtonHost.contains(state.translationButtonContainer)).toBe(false);
        expect(state.translationButtonContainer.style.pointerEvents).toBe("auto");
    });

    it("marks the button iframe before attaching its about:blank document", () => {
        const state = createButtonState();
        const appendChild = jest.spyOn(document.documentElement, "appendChild");
        let idWhenAttached;
        appendChild.mockImplementation((node) => {
            if (node === state.translationButtonContainer) idWhenAttached = node.id;
            return Node.prototype.appendChild.call(document.documentElement, node);
        });

        initializeButtonContainer(state, jest.fn());

        expect(idWhenAttached).toBe("edge-translate-button");
        appendChild.mockRestore();
    });

    it("promotes the button host as a popover and keeps a selection snapshot", () => {
        const { showModal, showPopover } = mockDialogMethods({ clearSelectionOnModal: true });
        const state = createButtonState();
        selectText("hello world");
        document.body.appendChild(createModalDialog());

        initializeButtonContainer(state, jest.fn());
        prepareButtonDimensions(state);
        showButton(state, createSelectionEvent());

        expect(showModal).not.toHaveBeenCalled();
        expect(showPopover).toHaveBeenCalledTimes(1);
        expect(state.translationButtonHost.dataset.edgeTranslateLayerMode).toBe("popover");
        expect(state.translationButtonHost.style.width).toBe("0px");
        expect(state.translationButtonHost.style.height).toBe("0px");
        expect(state.translationButtonHost.style.pointerEvents).toBe("none");
        expect(window.getSelection().toString()).toBe("hello world");
        expect(state.buttonSelection).toMatchObject({ text: "hello world" });
    });

    it("closes and removes the host when the button disappears", () => {
        const { close } = mockDialogMethods();
        const state = createButtonState();

        initializeButtonContainer(state, jest.fn());
        prepareButtonDimensions(state);
        showButton(state, createSelectionEvent());
        disappearButton(state);

        expect(close).not.toHaveBeenCalled();
        expect(state.hasButtonShown).toBe(false);
        expect(state.buttonSelection).toBeNull();
        expect(document.documentElement.contains(state.translationButtonContainer)).toBe(false);
        expect(document.getElementById("edge-translate-button-host")).toBeNull();
    });

    it("deduplicates repeated show requests for the same selected word", () => {
        const state = createButtonState();
        selectText("hello world");

        initializeButtonContainer(state, jest.fn());
        prepareButtonDimensions(state);
        showButton(state, createSelectionEvent());
        showButton(state, { x: 130, y: 100 });

        expect(state.translationButtonContainer.style.left).toBe("110px");
        expect(state.translationButtonContainer.style.top).toBe("48px");
    });

    it("requires a persistent blocker before changing direction", () => {
        jest.useFakeTimers();
        const state = createButtonState("AutoAvoid");
        const popup = createPopupRect({ left: 106, top: 44, right: 146, bottom: 84 });
        let popupVisible = false;
        setElementsFromPoint((x, y) => {
            if (popupVisible && x >= 106 && x <= 146 && y >= 44 && y <= 84) {
                return [state.translationButtonContainer, popup];
            }
            return [document.body];
        });

        initializeButtonContainer(state, jest.fn());
        prepareButtonDimensions(state);
        showButton(state, createSelectionEvent());
        popupVisible = true;
        jest.advanceTimersByTime(0);

        expect(state.translationButtonContainer.style.left).toBe("110px");
        expect(state.translationButtonContainer.style.top).toBe("48px");
        jest.advanceTimersByTime(49);
        expect(state.translationButtonContainer.style.top).toBe("48px");
        jest.advanceTimersByTime(1);
        expect(state.translationButtonContainer.style.left).toBe("110px");
        expect(state.translationButtonContainer.style.top).toBe("120px");

        disappearButton(state);
        jest.useRealTimers();
    });

    it("ignores a blocker that disappears during the confirmation window", () => {
        jest.useFakeTimers();
        const state = createButtonState("AutoAvoid");
        const popup = createPopupRect({ left: 106, top: 44, right: 146, bottom: 84 });
        let popupVisible = false;
        setElementsFromPoint((x, y) => {
            if (popupVisible && x >= 106 && x <= 146 && y >= 44 && y <= 84) {
                return [state.translationButtonContainer, popup];
            }
            return [document.body];
        });

        initializeButtonContainer(state, jest.fn());
        prepareButtonDimensions(state);
        showButton(state, createSelectionEvent());
        popupVisible = true;
        jest.advanceTimersByTime(0);
        popupVisible = false;
        jest.advanceTimersByTime(50);

        expect(state.translationButtonContainer.style.left).toBe("110px");
        expect(state.translationButtonContainer.style.top).toBe("48px");

        disappearButton(state);
        jest.useRealTimers();
    });

    it("does not rotate when every direction remains obstructed", () => {
        jest.useFakeTimers();
        const state = createButtonState("AutoAvoid");
        const overlay = createPopupRect({
            bottom: window.innerHeight,
            left: 0,
            right: window.innerWidth,
            top: 0,
        });
        setElementsFromPoint(() => [overlay, state.translationButtonContainer, document.body]);

        initializeButtonContainer(state, jest.fn());
        prepareButtonDimensions(state);
        showButton(state, createSelectionEvent());
        jest.advanceTimersByTime(1600);

        expect(state.buttonPlacementDirection).toBe("TopRight");
        expect(state.translationButtonContainer.style.left).toBe("110px");
        expect(state.translationButtonContainer.style.top).toBe("48px");

        disappearButton(state);
        jest.useRealTimers();
    });
});

function createButtonState(buttonPositionSetting = "TopRight") {
    return {
        buttonPositionSetting,
        hasButtonShown: false,
        originPositionX: 0,
        originPositionY: 0,
        originScrollX: 0,
        originScrollY: 0,
        scrollPropertyX: "pageXOffset",
        scrollPropertyY: "pageYOffset",
        scrollingElement: window,
        translationButtonContainer: document.createElement("iframe"),
        translationButtonHost: null,
    };
}

function createPopupRect(rect) {
    const popup = document.createElement("div");
    popup.style.position = "fixed";
    popup.getBoundingClientRect = () => ({
        ...rect,
        height: rect.bottom - rect.top,
        width: rect.right - rect.left,
    });
    document.body.appendChild(popup);
    return popup;
}

function setElementsFromPoint(value) {
    Object.defineProperty(document, "elementsFromPoint", {
        configurable: true,
        value,
    });
}

function prepareButtonDimensions(state) {
    Object.defineProperty(state.translationButtonContainer, "clientWidth", {
        configurable: true,
        value: 32,
    });
    Object.defineProperty(state.translationButtonContainer, "clientHeight", {
        configurable: true,
        value: 32,
    });
}

function createSelectionEvent() {
    return {
        x: 100,
        y: 100,
    };
}

function createModalDialog() {
    const dialog = document.createElement("dialog");
    dialog.matches = (selector) => selector === ":modal";
    return dialog;
}

function selectText(text) {
    const target = document.createElement("p");
    target.textContent = text;
    document.body.appendChild(target);

    const range = document.createRange();
    range.selectNodeContents(target);
    range.getBoundingClientRect = () => ({
        bottom: 54,
        height: 20,
        left: 12,
        right: 112,
        top: 34,
        width: 100,
    });
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
}

function mockDialogMethods({ clearSelectionOnModal = false } = {}) {
    const close = jest.fn(function closeMock() {
        this.open = false;
    });
    const hidePopover = jest.fn();
    const show = jest.fn(function showMock() {
        this.open = true;
    });
    const showModal = jest.fn(function showModalMock() {
        if (clearSelectionOnModal) window.getSelection().removeAllRanges();
        this.open = true;
    });
    const showPopover = jest.fn();

    replaceDialogMethod("close", close);
    replaceDialogMethod("hidePopover", hidePopover);
    replaceDialogMethod("show", show);
    replaceDialogMethod("showModal", showModal);
    replaceDialogMethod("showPopover", showPopover);
    return { close, hidePopover, show, showModal, showPopover };
}

function replaceDialogMethod(name, value) {
    Object.defineProperty(HTMLDialogElement.prototype, name, {
        configurable: true,
        value,
    });
}

function restoreDialogMethod(name, value) {
    if (typeof value === "function") {
        replaceDialogMethod(name, value);
        return;
    }

    delete HTMLDialogElement.prototype[name];
}
