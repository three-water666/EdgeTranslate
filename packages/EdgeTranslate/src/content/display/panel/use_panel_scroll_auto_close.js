import { useCallback, useEffect } from "preact/hooks";
import { useEvent } from "react-use";
import {
    getPageScrollTop,
    getPageViewportHeight,
    shouldClosePanelOnPageScroll,
} from "./panel_scroll.js";

export function usePanelScrollAutoClose(model, updateBounds) {
    const resetPanelScrollStartTop = useCallback(() => {
        model.panelScrollStartTopRef.current = getPageScrollTop();
    }, [model]);

    const windowScrollHandler = useCallback(() => {
        updateBounds();
        if (
            shouldClosePanelOnPageScroll({
                enabled: model.autoClosePanelOnPageScrollRef.current,
                open: model.open,
                contentType: model.contentTypeRef.current,
                startScrollTop: model.panelScrollStartTopRef.current,
                currentScrollTop: getPageScrollTop(),
                viewportHeight: getPageViewportHeight(),
            })
        ) {
            model.setOpen(false);
        }
    }, [model, updateBounds]);

    useEffect(() => {
        if (model.open) resetPanelScrollStartTop();
    }, [model.contentType, model.open, resetPanelScrollStartTop]);

    useEvent("scroll", windowScrollHandler, window);
}
