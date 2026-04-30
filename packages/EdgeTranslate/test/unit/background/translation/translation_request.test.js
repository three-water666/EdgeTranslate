import { submitTranslationRequest } from "background/translation/translation_request.js";

describe("translation request", () => {
    it("uses the current-tab translation path when no tab id is provided", () => {
        const textTranslation = createTextTranslationService();
        const options = { defaultTranslator: "google" };

        submitTranslationRequest(textTranslation, {
            text: "Selected text",
            position: [10, 20],
            options,
        });

        expect(textTranslation.translate).toHaveBeenCalledWith("Selected text", [10, 20], options);
        expect(textTranslation.translateOnTabWithOptions).not.toHaveBeenCalled();
    });

    it("uses the explicit-tab translation path when a tab id is provided", () => {
        const textTranslation = createTextTranslationService();
        const options = {
            skipStartEvent: true,
            timestamp: 123,
            translateMode: "screenshot",
        };

        submitTranslationRequest(textTranslation, {
            tabId: 7,
            text: "OCR text",
            position: [30, 40],
            options,
        });

        expect(textTranslation.translateOnTabWithOptions).toHaveBeenCalledWith({
            tabId: 7,
            text: "OCR text",
            position: [30, 40],
            options,
        });
        expect(textTranslation.translate).not.toHaveBeenCalled();
    });
});

function createTextTranslationService() {
    return {
        translate: jest.fn(),
        translateOnTabWithOptions: jest.fn(),
    };
}
