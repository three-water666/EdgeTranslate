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

    beforeEach(() => {
        document.documentElement.innerHTML = "<head></head><body></body>";
        originalClose = HTMLDialogElement.prototype.close;
        originalHidePopover = HTMLDialogElement.prototype.hidePopover;
        originalShow = HTMLDialogElement.prototype.show;
        originalShowModal = HTMLDialogElement.prototype.showModal;
        originalShowPopover = HTMLDialogElement.prototype.showPopover;
    });

    afterEach(() => {
        restoreDialogMethod("close", originalClose);
        restoreDialogMethod("hidePopover", originalHidePopover);
        restoreDialogMethod("show", originalShow);
        restoreDialogMethod("showModal", originalShowModal);
        restoreDialogMethod("showPopover", originalShowPopover);
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

    it("promotes the button host above page modal dialogs and keeps a selection snapshot", () => {
        const { showModal } = mockDialogMethods({ clearSelectionOnModal: true });
        const state = createButtonState();
        selectText("hello world");
        document.body.appendChild(createModalDialog());

        initializeButtonContainer(state, jest.fn());
        prepareButtonDimensions(state);
        showButton(state, createSelectionEvent());

        expect(showModal).toHaveBeenCalledTimes(1);
        expect(state.translationButtonHost.dataset.edgeTranslateLayerMode).toBe("modal");
        expect(state.translationButtonHost.style.pointerEvents).toBe("auto");
        expect(window.getSelection().toString()).toBe("");
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
});

function createButtonState() {
    return {
        buttonPositionSetting: "TopRight",
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
    range.getBoundingClientRect = () => ({ left: 12, top: 34 });
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
