import { getButtonPlacement, getButtonPosition } from "content/select/select_button_position.js";
import { getButtonAnchor } from "content/select/select_button_anchor.js";

describe("selection button position", () => {
    let originalElementsFromPoint;

    beforeEach(() => {
        document.documentElement.innerHTML = "<head></head><body></body>";
        window.getSelection().removeAllRanges();
        originalElementsFromPoint = document.elementsFromPoint;
    });

    afterEach(() => {
        if (originalElementsFromPoint) {
            setElementsFromPoint(originalElementsFromPoint);
        } else {
            delete document.elementsFromPoint;
        }
        window.getSelection().removeAllRanges();
    });

    it("prefers the upper-right position when no floating element overlaps", () => {
        const container = createButtonContainer();
        setElementsFromPoint(() => [document.body]);

        expect(getButtonPosition("AutoAvoid", container, createSelectionEvent())).toEqual({
            left: 110,
            top: 48,
        });
    });

    it("moves away from a floating page element", () => {
        const container = createButtonContainer();
        const popup = createPopupRect({ left: 106, top: 44, right: 146, bottom: 84 });
        setElementsFromPoint((x, y) => {
            if (x >= 106 && x <= 146 && y >= 44 && y <= 84) return [container, popup];
            return [document.body];
        });

        expect(getButtonPosition("AutoAvoid", container, createSelectionEvent())).toEqual({
            left: 110,
            top: 120,
        });
    });

    it("detects a wide page toolbar underneath the translation button", () => {
        const container = createButtonContainer();
        document.body.appendChild(container);
        const popup = createPopupRect({ left: 50, top: 30, right: 300, bottom: 85 });
        setElementsFromPoint((x, y) => {
            if (container.style.opacity !== "0") return [container];
            if (x >= 50 && x <= 300 && y >= 30 && y <= 85) return [popup];
            return [document.body];
        });

        expect(getButtonPosition("AutoAvoid", container, { x: 220, y: 100 })).toEqual({
            left: 230,
            top: 120,
        });
    });

    it("ignores ordinary page content underneath a candidate", () => {
        const container = createButtonContainer();
        const paragraph = document.createElement("p");
        document.body.appendChild(paragraph);
        setElementsFromPoint(() => [container, paragraph, document.body]);

        expect(getButtonPosition("AutoAvoid", container, createSelectionEvent())).toEqual({
            left: 110,
            top: 48,
        });
    });

    it("ignores absolute page layout without an explicit stacking level", () => {
        const container = createButtonContainer();
        const layout = createPopupRect({ left: 106, top: 44, right: 146, bottom: 84 });
        layout.style.position = "absolute";
        setElementsFromPoint(() => [container, layout, document.body]);

        expect(getButtonPosition("AutoAvoid", container, createSelectionEvent())).toEqual({
            left: 110,
            top: 48,
        });
    });

    it("moves when a page element is actually stacked above the button", () => {
        const container = createButtonContainer();
        const overlay = createPopupRect({ left: 106, top: 44, right: 146, bottom: 84 });
        overlay.style.position = "absolute";
        setElementsFromPoint((x, y) => {
            if (x >= 106 && x <= 146 && y >= 44 && y <= 84) return [overlay, container];
            return [document.body];
        });

        expect(getButtonPosition("AutoAvoid", container, createSelectionEvent())).toEqual({
            left: 110,
            top: 120,
        });
    });

    it("ignores a large fixed layout container underneath the button", () => {
        const container = createButtonContainer();
        const layout = createPopupRect({
            bottom: window.innerHeight,
            left: 0,
            right: window.innerWidth,
            top: 0,
        });
        setElementsFromPoint(() => [container, layout, document.body]);

        expect(getButtonPosition("AutoAvoid", container, createSelectionEvent())).toEqual({
            left: 110,
            top: 48,
        });
    });

    it("ignores positioned app layout while avoiding a selection toolbar", () => {
        const container = createButtonContainer();
        const appLayout = createPopupRect({
            bottom: window.innerHeight,
            left: 0,
            right: window.innerWidth,
            top: 0,
        });
        appLayout.style.position = "relative";
        appLayout.style.zIndex = "1";
        const toolbar = createPopupRect({ left: 50, top: 40, right: 150, bottom: 90 });
        setElementsFromPoint((x, y) => {
            if (x >= 50 && x <= 150 && y >= 40 && y <= 90) {
                return [container, toolbar, appLayout];
            }
            return [container, appLayout, document.body];
        });

        expect(getButtonPosition("AutoAvoid", container, createSelectionEvent())).toEqual({
            left: 110,
            top: 120,
        });
    });

    it("keeps its current direction when every candidate is obstructed", () => {
        const container = createButtonContainer();
        const overlay = createPopupRect({
            bottom: window.innerHeight,
            left: 0,
            right: window.innerWidth,
            top: 0,
        });
        setElementsFromPoint(() => [overlay, container, document.body]);

        const initialPlacement = getButtonPlacement("AutoAvoid", container, createSelectionEvent());
        const stablePlacement = getButtonPlacement("AutoAvoid", container, createSelectionEvent(), {
            currentDirection: initialPlacement.direction,
        });

        expect(initialPlacement.direction).toBe("TopRight");
        expect(stablePlacement).toEqual(initialPlacement);
    });

    it("does not move when only a thin edge of the button overlaps", () => {
        const container = createButtonContainer();
        const popup = createPopupRect({ left: 108, top: 44, right: 112, bottom: 84 });
        setElementsFromPoint((x, y) => {
            if (x >= 108 && x <= 112 && y >= 44 && y <= 84) return [container, popup];
            return [document.body];
        });

        expect(getButtonPosition("AutoAvoid", container, createSelectionEvent())).toEqual({
            left: 110,
            top: 48,
        });
    });

    it("keeps the current direction after its original blocker disappears", () => {
        const container = createButtonContainer();
        const popup = createPopupRect({ left: 106, top: 44, right: 146, bottom: 84 });
        let popupVisible = true;
        setElementsFromPoint((x, y) => {
            if (popupVisible && x >= 106 && x <= 146 && y >= 44 && y <= 84) {
                return [container, popup];
            }
            return [document.body];
        });

        const initialPlacement = getButtonPlacement("AutoAvoid", container, createSelectionEvent());
        popupVisible = false;
        const stablePlacement = getButtonPlacement("AutoAvoid", container, createSelectionEvent(), {
            currentDirection: initialPlacement.direction,
        });

        expect(initialPlacement.direction).toBe("BottomRight");
        expect(stablePlacement).toEqual(initialPlacement);
    });

    it("nudges a slightly clipped upper-right position instead of flipping below", () => {
        const container = createButtonContainer();
        setElementsFromPoint(() => [document.body]);

        expect(getButtonPosition("AutoAvoid", container, { x: 100, y: 50 })).toEqual({
            left: 110,
            top: 4,
        });
    });

    it("anchors repeated clicks to the selected word rectangle", () => {
        const container = createButtonContainer();
        const target = document.createElement("span");
        target.textContent = "stable";
        document.body.appendChild(target);
        const range = document.createRange();
        range.selectNodeContents(target);
        Object.defineProperty(range, "getClientRects", {
            configurable: true,
            value: () => [createRect({ left: 80, top: 90, right: 120, bottom: 110 })],
        });
        window.getSelection().addRange(range);
        setElementsFromPoint(() => [document.body]);

        const firstPosition = getButtonPosition(
            "AutoAvoid",
            container,
            getButtonAnchor({ x: 85, y: 100 })
        );
        const secondPosition = getButtonPosition(
            "AutoAvoid",
            container,
            getButtonAnchor({ x: 115, y: 100 })
        );

        expect(firstPosition).toEqual({ left: 130, top: 48 });
        expect(secondPosition).toEqual(firstPosition);
    });

    it("uses an in-view candidate near a viewport edge", () => {
        const container = createButtonContainer();
        setElementsFromPoint(() => [document.body]);

        expect(getButtonPosition("AutoAvoid", container, { x: 5, y: 5 })).toEqual({
            left: 15,
            top: 25,
        });
    });
});

function createButtonContainer() {
    const container = document.createElement("iframe");
    container.id = "edge-translate-button";
    Object.defineProperty(container, "clientWidth", { configurable: true, value: 32 });
    Object.defineProperty(container, "clientHeight", { configurable: true, value: 32 });
    return container;
}

function createSelectionEvent() {
    return { x: 100, y: 100 };
}

function createPopupRect(rect) {
    const popup = document.createElement("div");
    popup.style.position = "fixed";
    popup.getBoundingClientRect = () => ({
        ...rect,
        width: rect.right - rect.left,
        height: rect.bottom - rect.top,
    });
    document.body.appendChild(popup);
    return popup;
}

function createRect(rect) {
    return {
        ...rect,
        height: rect.bottom - rect.top,
        width: rect.right - rect.left,
    };
}

function setElementsFromPoint(value) {
    Object.defineProperty(document, "elementsFromPoint", {
        configurable: true,
        value,
    });
}
