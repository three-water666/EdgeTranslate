import { forwardSubframePointerDown } from "background/library/frame_events.js";
import { TOP_FRAME_POINTER_DOWN_EVENT } from "common/scripts/frame_events.js";

describe("subframe pointer event forwarding", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("targets only the top frame of the source tab", () => {
        expect(forwardSubframePointerDown({ tab: { id: 17 }, frameId: 3 })).toBe(true);

        expect(chrome.tabs.sendMessage).toHaveBeenCalledTimes(1);
        const [tabId, message, options] = chrome.tabs.sendMessage.mock.calls[0];
        expect(tabId).toBe(17);
        expect(options).toEqual({ frameId: 0 });
        expect(JSON.parse(message)).toEqual({
            type: "event",
            event: TOP_FRAME_POINTER_DOWN_EVENT,
        });
    });

    it("does not reflect top-frame or extension-page events", () => {
        expect(forwardSubframePointerDown({ tab: { id: 17 }, frameId: 0 })).toBe(false);
        expect(forwardSubframePointerDown({ frameId: 2 })).toBe(false);
        expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
    });
});
