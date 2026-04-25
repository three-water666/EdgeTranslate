import {
    isAutoClosePanelOnPageScrollEnabled,
    shouldClosePanelOnPageScroll,
} from "content/display/panel/panel_scroll.js";

describe("panel page scroll auto close", () => {
    it("closes after the page scrolls by one viewport", () => {
        expect(
            shouldClosePanelOnPageScroll({
                enabled: true,
                open: true,
                contentType: "RESULT",
                startScrollTop: 100,
                currentScrollTop: 900,
                viewportHeight: 800,
            })
        ).toBe(true);
    });

    it("does not close before one viewport of page scroll", () => {
        expect(
            shouldClosePanelOnPageScroll({
                enabled: true,
                open: true,
                contentType: "RESULT",
                startScrollTop: 100,
                currentScrollTop: 899,
                viewportHeight: 800,
            })
        ).toBe(false);
    });

    it("does not close when disabled or while the result is still loading", () => {
        const args = {
            open: true,
            startScrollTop: 0,
            currentScrollTop: 800,
            viewportHeight: 800,
        };

        expect(
            shouldClosePanelOnPageScroll({
                ...args,
                enabled: false,
                contentType: "RESULT",
            })
        ).toBe(false);
        expect(
            shouldClosePanelOnPageScroll({
                ...args,
                enabled: true,
                contentType: "LOADING",
            })
        ).toBe(false);
    });

    it("keeps auto close enabled unless the setting is explicitly false", () => {
        expect(isAutoClosePanelOnPageScrollEnabled()).toBe(true);
        expect(isAutoClosePanelOnPageScrollEnabled({})).toBe(true);
        expect(
            isAutoClosePanelOnPageScrollEnabled({
                AutoClosePanelOnPageScroll: true,
            })
        ).toBe(true);
        expect(
            isAutoClosePanelOnPageScrollEnabled({
                AutoClosePanelOnPageScroll: false,
            })
        ).toBe(false);
    });
});
