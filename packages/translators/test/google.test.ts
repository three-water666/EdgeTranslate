import GoogleTranslator from "../src/translators/google";

describe("google translator api", () => {
    const TRANSLATOR = new GoogleTranslator();

    it("to parse language detecting result", () => {
        const result = TRANSLATOR.parseDetectResult({
            ld_result: {
                srclangs: ["en"],
            },
        });

        expect(result).toEqual("en");
    });

    it("to parse translated result", () => {
        const result = TRANSLATOR.parseTranslateResult({
            sentences: [
                {
                    trans: "你好",
                    orig: "hello",
                },
            ],
        });

        expect(result.mainMeaning).toEqual("你好");
        expect(result.originalText).toEqual("hello");
    });

    it("to generate detect url with current TKK", () => {
        const url = TRANSLATOR.generateDetectURL("hello");

        expect(url).toContain("sl=auto");
        expect(url).toContain("tl=zh-cn");
        expect(url).toContain("q=hello");
    });
});
