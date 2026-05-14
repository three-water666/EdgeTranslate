import {
    createPanelRoot,
    showPanelRootNormally,
    syncPanelRootTopLayer,
} from "content/display/panel/panel_top_layer.js";

describe("panel top layer host", () => {
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

    it("keeps the panel host available as a normal non-modal dialog", () => {
        const { show } = mockDialogMethods();
        const root = mountPanelRoot();

        showPanelRootNormally(root);

        expect(root.tagName).toBe("DIALOG");
        expect(root.popover).toBe("manual");
        expect(root.dataset.edgeTranslateLayerMode).toBe("normal");
        expect(root.style.pointerEvents).toBe("none");
        expect(show).toHaveBeenCalledTimes(1);
        expect(document.getElementById("edge-translate-root-backdrop-style")).not.toBeNull();
    });

    it("promotes the panel host to modal when another dialog is open", () => {
        const { close, showModal } = mockDialogMethods();
        const root = mountPanelRoot();
        showPanelRootNormally(root);
        document.body.appendChild(createOpenDialog("page-dialog"));

        syncPanelRootTopLayer(true);

        expect(close).toHaveBeenCalledTimes(1);
        expect(showModal).toHaveBeenCalledTimes(1);
        expect(showModal.mock.contexts[0]).toBe(root);
        expect(root.dataset.edgeTranslateLayerMode).toBe("modal");
        expect(root.style.pointerEvents).toBe("auto");
    });

    it("uses a popover layer for page popovers without making the page modal", () => {
        const { showModal, showPopover } = mockDialogMethods();
        mountPanelRoot();
        document.body.appendChild(createOpenPopover());

        syncPanelRootTopLayer(true);

        expect(showPopover).toHaveBeenCalledTimes(1);
        expect(showModal).not.toHaveBeenCalled();
    });

    it("returns a modal panel host to normal when the panel closes", () => {
        const { close, show, showModal } = mockDialogMethods();
        const root = mountPanelRoot();
        showPanelRootNormally(root);
        document.body.appendChild(createOpenDialog("page-dialog"));
        syncPanelRootTopLayer(true);

        syncPanelRootTopLayer(false);

        expect(showModal).toHaveBeenCalledTimes(1);
        expect(close).toHaveBeenCalledTimes(2);
        expect(show).toHaveBeenCalledTimes(1);
        expect(root.open).toBe(false);
        expect(root.dataset.edgeTranslateLayerMode).toBe("normal");
    });

    it("prevents browser cancel from closing the panel host implicitly", () => {
        const root = mountPanelRoot();
        const event = new Event("cancel", { bubbles: true, cancelable: true });

        const dispatchResult = root.dispatchEvent(event);

        expect(dispatchResult).toBe(false);
        expect(event.defaultPrevented).toBe(true);
    });
});

function mountPanelRoot() {
    const root = createPanelRoot();
    document.body.appendChild(root);
    return root;
}

function createOpenDialog(id) {
    const dialog = document.createElement("dialog");
    dialog.id = id;
    dialog.setAttribute("open", "");
    dialog.matches = (selector) => selector === ":modal";
    return dialog;
}

function createOpenPopover() {
    const popover = document.createElement("div");
    popover.setAttribute("popover", "manual");
    popover.matches = (selector) => selector === ":popover-open";
    return popover;
}

function mockDialogMethods() {
    const close = jest.fn(function closeMock() {
        this.open = false;
    });
    const hidePopover = jest.fn();
    const show = jest.fn(function showMock() {
        this.open = true;
    });
    const showModal = jest.fn(function showModalMock() {
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
