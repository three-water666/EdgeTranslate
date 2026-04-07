import HybridTranslator from "../src/translators/hybrid";

describe("hybrid translator api", () => {
    const TRANSLATOR = new HybridTranslator(
        {
            translators: ["GoogleTranslate"],
            selections: {
                originalText: "GoogleTranslate",
                mainMeaning: "GoogleTranslate",
                tPronunciation: "GoogleTranslate",
                sPronunciation: "GoogleTranslate",
                detailedMeanings: "GoogleTranslate",
                definitions: "GoogleTranslate",
                examples: "GoogleTranslate",
            },
        },
        {}
    );

    beforeEach(() => {
        jest.restoreAllMocks();
    });

    it("to detect language with main translator", async () => {
        jest.spyOn(TRANSLATOR.REAL_TRANSLATORS.GoogleTranslate, "detect").mockResolvedValue("en");

        await expect(TRANSLATOR.detect("hello")).resolves.toEqual("en");
    });

    it("to translate with configured translator selection", async () => {
        jest.spyOn(TRANSLATOR.REAL_TRANSLATORS.GoogleTranslate, "translate").mockResolvedValue({
            originalText: "hello",
            mainMeaning: "你好",
            tPronunciation: "ni hao",
            sPronunciation: "hello",
            detailedMeanings: [],
            definitions: [],
            examples: [],
        });

        await expect(TRANSLATOR.translate("hello", "en", "zh-CN")).resolves.toMatchObject({
            originalText: "hello",
            mainMeaning: "你好",
        });
    });

    it("to update config with available translators only", () => {
        const newConfig = TRANSLATOR.updateConfigFor("en", "zh-CN");

        expect(newConfig.translators).toContain("GoogleTranslate");
        expect(newConfig.selections.mainMeaning).toEqual("GoogleTranslate");
    });
});
