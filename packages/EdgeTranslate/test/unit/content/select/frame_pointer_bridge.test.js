import {
    isExtensionOwnedFrame,
    isExtensionOwnedPointerEvent,
    registerSubframePointerDownBridge,
} from "content/select/frame_pointer_bridge.js";

describe("subframe pointer bridge", () => {
    it("does not add another listener to the top frame", () => {
        const addEventListener = jest.spyOn(document, "addEventListener");

        registerSubframePointerDownBridge({ emit: jest.fn() });

        expect(addEventListener).not.toHaveBeenCalled();
        addEventListener.mockRestore();
    });

    it("identifies the extension button iframe", () => {
        const buttonFrame = document.createElement("iframe");
        buttonFrame.id = "edge-translate-button";

        expect(isExtensionOwnedFrame(buttonFrame)).toBe(true);
        expect(isExtensionOwnedFrame(document.createElement("iframe"))).toBe(false);
    });

    it.each([
        "edge-translate-button",
        "edge-translate-button-host",
        "edge-translate-root",
        "edge-translate-screenshot-overlay",
        "edge-translate-long-press-highlight",
    ])("ignores Edge Translate control %s", (id) => {
        const extensionControl = document.createElement("div");
        extensionControl.id = id;

        expect(
            isExtensionOwnedPointerEvent({
                composedPath: () => [document.createElement("span"), extensionControl, document],
            })
        ).toBe(true);
    });

    it("forwards ordinary iframe content", () => {
        const target = document.createElement("button");
        expect(isExtensionOwnedPointerEvent({ target })).toBe(false);
    });
});
