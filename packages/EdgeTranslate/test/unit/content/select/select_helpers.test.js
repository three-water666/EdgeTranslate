import { getButtonPosition } from "content/select/select_helpers.js";

describe("selection button position", () => {
    let originalElementsFromPoint;

    beforeEach(() => {
        document.documentElement.innerHTML = "<head></head><body></body>";
        originalElementsFromPoint = document.elementsFromPoint;
    });

    afterEach(() => {
        if (originalElementsFromPoint) {
            setElementsFromPoint(originalElementsFromPoint);
        } else {
            delete document.elementsFromPoint;
        }
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
            left: 58,
            top: 48,
        });
    });

    it("detects a wide page toolbar underneath the translation button", () => {
        const container = createButtonContainer();
        document.body.appendChild(container);
        const popup = createPopupRect({ left: 50, top: 30, right: 300, bottom: 85 });
        setElementsFromPoint((x, y) => {
            if (container.style.visibility !== "hidden") return [container];
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

function setElementsFromPoint(value) {
    Object.defineProperty(document, "elementsFromPoint", {
        configurable: true,
        value,
    });
}
