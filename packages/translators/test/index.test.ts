import { LANGUAGES, HybridTranslator } from "../src/index";

const HYBRID_TRANSLATOR = new HybridTranslator(
    {
        translators: ["BingTranslate", "GoogleTranslate"],
        selections: {
            originalText: "BingTranslate",
            mainMeaning: "BingTranslate",
            tPronunciation: "BingTranslate",
            sPronunciation: "GoogleTranslate",
            detailedMeanings: "GoogleTranslate",
            definitions: "GoogleTranslate",
            examples: "GoogleTranslate",
        },
    },
    {}
);

const TRANSLATORS = {
    hybrid: HYBRID_TRANSLATOR,
    ...HYBRID_TRANSLATOR.REAL_TRANSLATORS,
};

describe("Make sure that all of the supported languages in translators can be found in languages.js", () => {
    it("to test supported languages in google.ts", () => {
        const languages = TRANSLATORS.GoogleTranslate.supportedLanguages();
        for (const lan of languages) {
            if (lan !== "auto") {
                expect(LANGUAGES[lan as keyof typeof LANGUAGES]).toBeDefined();
            }
        }
    });

    it("to test supported languages in bing.ts", () => {
        const languages = TRANSLATORS.BingTranslate.supportedLanguages();
        for (const lan of languages) {
            if (lan !== "auto") {
                expect(LANGUAGES[lan as keyof typeof LANGUAGES]).toBeDefined();
            }
        }
    });
});
