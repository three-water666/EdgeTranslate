import {
    isAutoClosePanelOnPageScrollEnabled,
    shouldClosePanelOnPageScroll,
} from "content/display/panel/panel_scroll.js";
import { attachDragHandlers, attachResizeHandlers } from "content/display/panel/panel_runtime.js";
import { setPanelDragShield } from "content/display/panel/panel_drag_shield.js";

describe("panel page scroll auto close", () => {
    it("closes after the page scrolls by one viewport", () => {
        expect(
            shouldClosePanelOnPageScroll({
                enabled: true,
                open: true,
                contentType: "RESULT",
                startScrollTop: 100,
                currentScrollTop: 900,
                viewportHeight: 800,
            })
        ).toBe(true);
    });

    it("does not close before one viewport of page scroll", () => {
        expect(
            shouldClosePanelOnPageScroll({
                enabled: true,
                open: true,
                contentType: "RESULT",
                startScrollTop: 100,
                currentScrollTop: 899,
                viewportHeight: 800,
            })
        ).toBe(false);
    });

    it("does not close when the panel is fixed", () => {
        expect(
            shouldClosePanelOnPageScroll({
                enabled: true,
                open: true,
                fixed: true,
                contentType: "RESULT",
                startScrollTop: 100,
                currentScrollTop: 900,
                viewportHeight: 800,
            })
        ).toBe(false);
    });

    it("does not close when disabled or while the result is still loading", () => {
        const args = {
            open: true,
            startScrollTop: 0,
            currentScrollTop: 800,
            viewportHeight: 800,
        };

        expect(
            shouldClosePanelOnPageScroll({
                ...args,
                enabled: false,
                contentType: "RESULT",
            })
        ).toBe(false);
        expect(
            shouldClosePanelOnPageScroll({
                ...args,
                enabled: true,
                contentType: "LOADING",
            })
        ).toBe(false);
    });

    it("keeps auto close enabled unless the setting is explicitly false", () => {
        expect(isAutoClosePanelOnPageScrollEnabled()).toBe(true);
        expect(isAutoClosePanelOnPageScrollEnabled({})).toBe(true);
        expect(
            isAutoClosePanelOnPageScrollEnabled({
                AutoClosePanelOnPageScroll: true,
            })
        ).toBe(true);
        expect(
            isAutoClosePanelOnPageScrollEnabled({
                AutoClosePanelOnPageScroll: false,
            })
        ).toBe(false);
    });
});

describe("panel drag shield", () => {
    it("only intercepts page input while active", () => {
        const shield = document.createElement("div");
        const shieldRef = { current: shield };

        setPanelDragShield(shieldRef, true, "ew-resize");
        expect(shield.style.pointerEvents).toBe("auto");
        expect(shield.style.cursor).toBe("ew-resize");

        setPanelDragShield(shieldRef, false);
        expect(shield.style.pointerEvents).toBe("none");
        expect(shield.style.cursor).toBe("");
    });

    it("covers iframes during user resize but not programmatic resize", () => {
        const moveablePanel = createMoveablePanelStub();
        const shield = document.createElement("div");
        const dragShieldElRef = { current: shield };
        const resizeHandle = document.createElement("div");
        resizeHandle.style.cursor = "ew-resize";

        attachResizeHandlers({
            moveablePanel,
            dragShieldElRef,
            displaySettingRef: {
                current: {
                    type: "floating",
                    floatingData: { width: 0.2, height: 0.6 },
                    fixedData: { width: 0.2 },
                },
            },
            resizePageFlag: { current: false },
            setUsePDFMaskLayer: jest.fn(),
            updateDisplaySetting: jest.fn(),
        });

        moveablePanel.handlers.resizeStart({
            set: jest.fn(),
            inputEvent: { target: resizeHandle },
        });
        expect(shield.style.pointerEvents).toBe("auto");
        expect(shield.style.cursor).toBe("ew-resize");

        moveablePanel.handlers.resizeEnd({
            width: 300,
            height: 400,
            translate: [0, 0],
            target: moveablePanel.targetElement,
            inputEvent: {},
        });
        expect(shield.style.pointerEvents).toBe("none");

        moveablePanel.handlers.resizeStart({ set: jest.fn() });
        expect(shield.style.pointerEvents).toBe("none");
    });

    it("preserves a drag-owned shield during programmatic resize", () => {
        const moveablePanel = createMoveablePanelStub();
        const shield = document.createElement("div");
        const dragShieldElRef = { current: shield };
        const head = document.createElement("div");
        const displaySettingRef = {
            current: {
                type: "fixed",
                floatingData: { width: 0.2, height: 0.6 },
                fixedData: { width: 0.2, position: "right" },
            },
        };

        attachDragHandlers({
            moveablePanel,
            dragShieldElRef,
            headElRef: { current: head },
            displaySettingRef,
            setUsePDFMaskLayer: jest.fn(),
            setHighlight: jest.fn(),
            showFixedPanel: jest.fn(),
            removeFixedPanel: jest.fn(),
            showFloatingPanel: jest.fn(),
            updateDisplaySetting: jest.fn(),
        });
        attachResizeHandlers({
            moveablePanel,
            dragShieldElRef,
            displaySettingRef,
            resizePageFlag: { current: false },
            setUsePDFMaskLayer: jest.fn(),
            updateDisplaySetting: jest.fn(),
        });

        moveablePanel.handlers.dragStart({
            set: jest.fn(),
            stop: jest.fn(),
            inputEvent: { composedPath: () => [head] },
        });
        expect(shield.style.pointerEvents).toBe("auto");

        moveablePanel.handlers.resizeStart({ set: jest.fn() });
        moveablePanel.handlers.resizeEnd({
            translate: [0, 0],
            target: moveablePanel.targetElement,
        });
        expect(shield.style.pointerEvents).toBe("auto");

        moveablePanel.handlers.dragEnd({ translate: [0, 0], inputEvent: {} });
        expect(shield.style.pointerEvents).toBe("none");
    });

    it("covers iframes for a header drag and releases on drag end", () => {
        const moveablePanel = createMoveablePanelStub();
        const shield = document.createElement("div");
        const head = document.createElement("div");

        attachDragHandlers({
            moveablePanel,
            dragShieldElRef: { current: shield },
            headElRef: { current: head },
            displaySettingRef: {
                current: {
                    type: "floating",
                    fixedData: { position: "right" },
                },
            },
            setUsePDFMaskLayer: jest.fn(),
            setHighlight: jest.fn(),
            showFixedPanel: jest.fn(),
            removeFixedPanel: jest.fn(),
            showFloatingPanel: jest.fn(),
            updateDisplaySetting: jest.fn(),
        });

        moveablePanel.handlers.dragStart({
            set: jest.fn(),
            stop: jest.fn(),
            inputEvent: { composedPath: () => [head] },
        });
        expect(shield.style.pointerEvents).toBe("auto");
        expect(shield.style.cursor).toBe("grabbing");

        moveablePanel.handlers.dragEnd({ translate: [0, 0], inputEvent: {} });
        expect(shield.style.pointerEvents).toBe("none");
    });

    it("releases the shield when drag and resize interactions are canceled", () => {
        const moveablePanel = createMoveablePanelStub();
        const shield = document.createElement("div");
        const dragShieldElRef = { current: shield };
        const head = document.createElement("div");
        const displaySettingRef = {
            current: {
                type: "floating",
                floatingData: { width: 0.2, height: 0.6 },
                fixedData: { width: 0.2, position: "right" },
            },
        };

        attachDragHandlers({
            moveablePanel,
            dragShieldElRef,
            headElRef: { current: head },
            displaySettingRef,
            setUsePDFMaskLayer: jest.fn(),
            setHighlight: jest.fn(),
            showFixedPanel: jest.fn(),
            removeFixedPanel: jest.fn(),
            showFloatingPanel: jest.fn(),
            updateDisplaySetting: jest.fn(),
        });
        attachResizeHandlers({
            moveablePanel,
            dragShieldElRef,
            displaySettingRef,
            resizePageFlag: { current: false },
            setUsePDFMaskLayer: jest.fn(),
            updateDisplaySetting: jest.fn(),
        });

        moveablePanel.handlers.dragStart({
            set: jest.fn(),
            stop: jest.fn(),
            inputEvent: { composedPath: () => [head] },
        });
        moveablePanel.handlers.dragEnd({ translate: [0, 0], canceled: true });
        expect(shield.style.pointerEvents).toBe("none");

        moveablePanel.handlers.resizeStart({ set: jest.fn(), inputEvent: {} });
        expect(shield.style.pointerEvents).toBe("auto");
        moveablePanel.handlers.resizeEnd({
            width: 300,
            height: 400,
            translate: [0, 0],
            target: moveablePanel.targetElement,
            canceled: true,
        });
        expect(shield.style.pointerEvents).toBe("none");
    });

    it("persists the final fixed width when blur cancels a user resize", () => {
        const moveablePanel = createMoveablePanelStub();
        const displaySettingRef = {
            current: {
                type: "fixed",
                floatingData: { width: 0.2, height: 0.6 },
                fixedData: { width: 0.2, position: "right" },
            },
        };
        const updateDisplaySetting = jest.fn();

        attachResizeHandlers({
            moveablePanel,
            dragShieldElRef: { current: document.createElement("div") },
            displaySettingRef,
            resizePageFlag: { current: true },
            setUsePDFMaskLayer: jest.fn(),
            updateDisplaySetting,
        });

        moveablePanel.handlers.resizeStart({ set: jest.fn(), inputEvent: {} });
        moveablePanel.handlers.resize({
            target: moveablePanel.targetElement,
            width: 320,
            height: 500,
            translate: [0, 0],
            inputEvent: {},
        });
        moveablePanel.handlers.resizeEnd({
            target: moveablePanel.targetElement,
            width: 320,
            height: 500,
            translate: [0, 0],
            canceled: true,
        });

        expect(displaySettingRef.current.fixedData.width).toBe(320 / window.innerWidth);
        expect(document.body.style.width).toBe(`${(1 - 320 / window.innerWidth) * 100}%`);
        expect(updateDisplaySetting).toHaveBeenCalledTimes(1);

        moveablePanel.handlers.resizeStart({ set: jest.fn() });
        moveablePanel.handlers.resizeEnd({
            target: moveablePanel.targetElement,
            width: 400,
            height: 500,
            translate: [0, 0],
        });

        expect(displaySettingRef.current.fixedData.width).toBe(320 / window.innerWidth);
        expect(updateDisplaySetting).toHaveBeenCalledTimes(1);
    });
});

function createMoveablePanelStub() {
    const targetElement = document.createElement("div");
    targetElement.style.transform = "translate(0px, 0px)";
    return {
        targetElement,
        handlers: {},
        on(event, handler) {
            this.handlers[event] = handler;
            return this;
        },
    };
}
