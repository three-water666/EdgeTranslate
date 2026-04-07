jest.mock("../src/axios", () => ({
    __esModule: true,
    default: {
        get: jest.fn(),
    },
}));

import axios from "../src/axios";
import BingTranslator from "../src/translators/bing";

describe("bing translator api", () => {
    const TRANSLATOR = new BingTranslator();

    beforeEach(() => {
        jest.restoreAllMocks();
    });

    it("to update IG and IID", async () => {
        (axios.get as jest.Mock).mockResolvedValue({
            data: `
                IG:"TESTIG123"
                var params_AbusePreventionHelper = [123456,"test-token",null];
                <div id="rich_tta" data-iid="translator.1"></div>
            `,
            request: {
                responseURL: "https://cn.bing.com/translator",
            },
        } as any);

        await TRANSLATOR.updateTokens();

        expect(TRANSLATOR.IG).toEqual("TESTIG123");
        expect(TRANSLATOR.IID).toEqual("translator.1");
        expect(TRANSLATOR.token).toEqual("test-token");
        expect(TRANSLATOR.key).toEqual("123456");
    });
});
