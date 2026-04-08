import { resolveContextMenuSelection } from "background/library/context_menu.js";

describe("context menu selection resolution", () => {
    it("prefers browser selection text over content-script text", () => {
        const result = resolveContextMenuSelection(
            { selectionText: "committed on Nov 4, 2025" },
            { text: "committed", position: [12, 34] }
        );

        expect(result).toEqual({
            text: "committed on Nov 4, 2025",
            position: [12, 34],
        });
    });

    it("falls back to browser selection text without content-script selection", () => {
        const result = resolveContextMenuSelection(
            { selectionText: "committed on Nov 4, 2025" },
            null
        );

        expect(result).toEqual({
            text: "committed on Nov 4, 2025",
            position: null,
        });
    });

    it("falls back to content-script text when browser selection text is unavailable", () => {
        const result = resolveContextMenuSelection(
            { selectionText: "" },
            { text: "committed", position: [12, 34] }
        );

        expect(result).toEqual({
            text: "committed",
            position: [12, 34],
        });
    });

    it("returns null when neither source has a selection", () => {
        expect(
            resolveContextMenuSelection({ selectionText: "   " }, { text: "", position: null })
        ).toBe(null);
    });
});
