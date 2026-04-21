import {
    recognizeOcrImage,
    reorderVerticalOcrText,
    selectBetterOcrResult,
    shouldRetryVerticalTextRecognition,
} from "offscreen/ocr_recognition.js";

function createOcrResult(text, confidence) {
    return {
        data: {
            text,
            confidence,
        },
    };
}

function createSymbol(text, bbox) {
    return {
        text,
        bbox: {
            x1: bbox.x0 + 10,
            y1: bbox.y0 + 10,
            ...bbox,
        },
    };
}

function createOcrBlocks(symbols) {
    return [
        {
            paragraphs: [
                {
                    lines: [
                        {
                            words: [
                                {
                                    symbols,
                                },
                            ],
                        },
                    ],
                },
            ],
        },
    ];
}

describe("recognizeOcrImage", () => {
    it("retries tall and narrow low-quality OCR with vertical text PSM", async () => {
        const worker = {
            recognize: jest
                .fn()
                .mockResolvedValueOnce(createOcrResult("", 0))
                .mockResolvedValueOnce(createOcrResult("vertical text", 90)),
        };

        await expect(
            recognizeOcrImage(worker, "image", {
                width: 40,
                height: 160,
            })
        ).resolves.toBe("vertical text");

        expect(worker.recognize).toHaveBeenNthCalledWith(1, "image", undefined, undefined);
        expect(worker.recognize).toHaveBeenNthCalledWith(
            2,
            "image",
            {
                tessedit_pageseg_mode: "5",
            },
            {
                text: true,
                blocks: true,
            }
        );
    });
});

describe("reorderVerticalOcrText", () => {
    it("orders Japanese vertical text from right to left and top to bottom", () => {
        const blocks = createOcrBlocks([
            createSymbol("こ", { x0: 100, y0: 10 }),
            createSymbol("ん", { x0: 100, y0: 30 }),
            createSymbol("に", { x0: 80, y0: 10 }),
            createSymbol("ち", { x0: 80, y0: 30 }),
            createSymbol("は", { x0: 80, y0: 50 }),
        ]);

        expect(reorderVerticalOcrText(blocks)).toBe("こんにちは");
    });

    it("falls back to word boxes when symbols are unavailable", () => {
        const blocks = [
            {
                paragraphs: [
                    {
                        lines: [
                            {
                                words: [
                                    {
                                        text: "右",
                                        bbox: { x0: 100, y0: 10, x1: 110, y1: 20 },
                                    },
                                    {
                                        text: "左",
                                        bbox: { x0: 80, y0: 10, x1: 90, y1: 20 },
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ];

        expect(reorderVerticalOcrText(blocks)).toBe("右左");
    });
});

describe("shouldRetryVerticalTextRecognition", () => {
    it("retries low-quality OCR for tall and narrow selections", () => {
        expect(
            shouldRetryVerticalTextRecognition(createOcrResult("", 0), {
                width: 40,
                height: 160,
            })
        ).toBe(true);
    });

    it("keeps regular OCR for wide selections", () => {
        expect(
            shouldRetryVerticalTextRecognition(createOcrResult("", 0), {
                width: 160,
                height: 40,
            })
        ).toBe(false);
    });

    it("keeps confident regular OCR for tall and narrow selections", () => {
        expect(
            shouldRetryVerticalTextRecognition(createOcrResult("recognized text", 92), {
                width: 40,
                height: 160,
            })
        ).toBe(false);
    });
});

describe("selectBetterOcrResult", () => {
    it("uses fallback OCR when it has a better score", () => {
        const primaryResult = createOcrResult("x", 10);
        const fallbackResult = createOcrResult("vertical text", 80);

        expect(selectBetterOcrResult(primaryResult, fallbackResult)).toBe(fallbackResult);
    });

    it("keeps primary OCR when fallback is not better", () => {
        const primaryResult = createOcrResult("regular text", 88);
        const fallbackResult = createOcrResult("x", 20);

        expect(selectBetterOcrResult(primaryResult, fallbackResult)).toBe(primaryResult);
    });
});
