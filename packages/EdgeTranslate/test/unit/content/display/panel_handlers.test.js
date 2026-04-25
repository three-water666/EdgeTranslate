import {
    handleTranslated,
    handleTranslatorSelect,
    syncPanelChangedSettings,
} from "content/display/panel/panel_handlers.js";
import { panelChannel } from "content/display/panel/panel_shared.js";

jest.mock("content/display/panel/panel_shared.js", () => ({
    panelChannel: {
        request: jest.fn(),
    },
    checkTimestamp: jest.fn(() => true),
}));

describe("panel handlers", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        window.translateResult = {};
    });

    it("keeps original text after a translation result is applied", () => {
        const model = createModel();
        window.translateResult.originalText = "hello";

        handleTranslated(model, {
            timestamp: 1,
            result: "你好",
        });

        expect(window.translateResult.originalText).toEqual("hello");
        expect(model.setContentType).toHaveBeenCalledWith("RESULT");
    });

    it("retranslates the original text when selecting another translator", async () => {
        const model = createModel();
        window.translateResult.originalText = "hello";
        panelChannel.request.mockResolvedValueOnce();

        handleTranslatorSelect(model, "GoogleTranslate");
        await Promise.resolve();

        expect(model.setCurrentTranslator).toHaveBeenCalledWith("GoogleTranslate");
        expect(panelChannel.request).toHaveBeenNthCalledWith(1, "update_default_translator", {
            translator: "GoogleTranslate",
        });
        expect(panelChannel.request).toHaveBeenNthCalledWith(2, "translate", {
            text: "hello",
            translator: "GoogleTranslate",
        });
    });

    it("syncs the page-scroll auto-close setting from storage changes", () => {
        const model = createModel();

        syncPanelChangedSettings(
            model,
            {
                LayoutSettings: {
                    newValue: { AutoClosePanelOnPageScroll: false },
                },
            },
            "sync"
        );

        expect(model.autoClosePanelOnPageScrollRef.current).toBe(false);

        syncPanelChangedSettings(
            model,
            {
                LayoutSettings: {
                    newValue: { AutoClosePanelOnPageScroll: true },
                },
            },
            "sync"
        );

        expect(model.autoClosePanelOnPageScrollRef.current).toBe(true);
    });
});

function createModel() {
    return {
        setOpen: jest.fn(),
        setContentType: jest.fn(),
        setContent: jest.fn(),
        setCurrentTranslator: jest.fn(),
        autoClosePanelOnPageScrollRef: { current: true },
    };
}
