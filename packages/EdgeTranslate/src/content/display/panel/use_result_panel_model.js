import { useEffect, useState, useRef, useCallback } from "preact/hooks";
import { useLatest, useEvent, useClickAway } from "react-use";
import { DEFAULT_SETTINGS, getOrSetDefaultSettings } from "common/scripts/settings.js";
import {
    getScrollbarWidth,
    hasScrollbar,
    resolveFloatingPanelPosition,
    resizeFloatingPanel,
    applyFixedPanelLayout,
    removeFixedPanelLayout,
} from "./panel_runtime.js";
import { usePanelScrollAutoClose } from "./use_panel_scroll_auto_close.js";
import { panelChannel } from "./panel_shared.js";
import {
    createDefaultDisplaySetting,
    normalizeDisplaySetting,
    initializePanelSettings,
    handleTranslating,
    handleTranslated,
    handleTranslateError,
    handlePanelCommand,
    createPanelViewModel,
    handlePanelClosed,
    handlePanelOpened,
    syncPanelChangedSettings,
} from "./panel_handlers.js";

const scrollbarWidth = getScrollbarWidth();
const bodyStyleState = { cssText: "" };

export function useResultPanelModel() {
    const model = usePanelState();
    usePanelBehavior(model);
    usePanelChannels(model);
    return createPanelViewModel(model);
}

function loadDisplaySetting(model, updateDisplaySetting) {
    return getOrSetDefaultSettings("DisplaySetting", DEFAULT_SETTINGS).then((result) => {
        if (result.DisplaySetting === undefined) {
            updateDisplaySetting();
            return;
        }

        model.displaySettingRef.current = normalizeDisplaySetting(result.DisplaySetting);
    });
}

function createStableDisplayStatusChangeHandler({
    modelRef,
    removeFixedPanelRef,
    showFixedPanelRef,
    showFloatingPanelRef,
    updateDisplaySettingRef,
    showPanelRef,
}) {
    return (panelEl) => {
        const currentModel = modelRef.current;
        currentModel.panelElRef.current = panelEl;
        if (!panelEl) {
            handlePanelClosed(currentModel, removeFixedPanelRef.current);
            return;
        }
        handlePanelOpened({
            model: currentModel,
            panelEl,
            showFixedPanel: showFixedPanelRef.current,
            removeFixedPanel: removeFixedPanelRef.current,
            showFloatingPanel: showFloatingPanelRef.current,
            updateDisplaySetting: updateDisplaySettingRef.current,
            showPanel: showPanelRef.current,
        });
    };
}

function getDisplayStatusChangeHandler(args) {
    const { onDisplayStatusChangeRef } = args;
    if (!onDisplayStatusChangeRef.current) {
        onDisplayStatusChangeRef.current = createStableDisplayStatusChangeHandler(args);
    }
    return onDisplayStatusChangeRef.current;
}

function usePanelState() {
    return {
        ...usePanelStatusState(),
        ...usePanelRefState(),
    };
}

function usePanelStatusState() {
    const [open, setOpen] = useState(false);
    const [panelFix, setPanelFix] = useState();
    const [contentType, setContentType] = useState("LOADING");
    const [content, setContent] = useState({});
    const [availableTranslators, setAvailableTranslators] = useState();
    const [currentTranslator, setCurrentTranslator] = useState();
    const [highlight, setHighlight] = useState({ show: false, position: "right" });
    const [displayType, setDisplayType] = useState("floating");
    const [usePDFMaskLayer, setUsePDFMaskLayer] = useState(false);
    const [moveableReady, setMoveableReady] = useState(false);

    return {
        open,
        setOpen,
        panelFix,
        setPanelFix,
        contentType,
        setContentType,
        contentTypeRef: useLatest(contentType),
        content,
        setContent,
        contentRef: useLatest(content),
        availableTranslators,
        setAvailableTranslators,
        currentTranslator,
        setCurrentTranslator,
        highlight,
        setHighlight,
        displayType,
        setDisplayType,
        usePDFMaskLayer,
        setUsePDFMaskLayer,
        moveableReady,
        setMoveableReady,
    };
}

function usePanelRefState() {
    return {
        containerElRef: useRef(),
        panelElRef: useRef(),
        headElRef: useRef(),
        moveablePanelRef: useRef(null),
        simplebarRef: useRef(),
        resizePageFlag: useRef(false),
        displaySettingRef: useRef(createDefaultDisplaySetting()),
        autoClosePanelOnPageScrollRef: useRef(
            DEFAULT_SETTINGS.LayoutSettings.AutoClosePanelOnPageScroll
        ),
        panelScrollStartTopRef: useRef(0),
    };
}

function usePanelBehavior(model) {
    const updateDisplaySetting = useCallback(() => {
        chrome.storage.sync.set({ DisplaySetting: model.displaySettingRef.current });
    }, [model.displaySettingRef]);

    const getDisplaySetting = useCallback(() => {
        return loadDisplaySetting(model, updateDisplaySetting);
    }, [model, updateDisplaySetting]);

    const move = useCallback(
        (width, height, left, top) => {
            const moveablePanel = model.moveablePanelRef.current;
            if (!moveablePanel) return false;
            moveablePanel.request("draggable", { x: left, y: top });
            moveablePanel.request("resizable", { width, height });
            return true;
        },
        [model.moveablePanelRef]
    );

    const showFloatingPanel = useCallback(() => {
        if (!model.moveablePanelRef.current) return;
        model.setDisplayType("floating");
        resizeFloatingPanel({
            moveablePanel: model.moveablePanelRef.current,
            displaySettingRef: model.displaySettingRef,
            contentType: model.contentTypeRef.current,
            headEl: model.headElRef.current,
            simplebar: model.simplebarRef.current,
        });
    }, [model]);

    const showFixedPanel = useCallback(async () => {
        model.setDisplayType("fixed");
        await applyFixedPanelLayout({
            displaySettingRef: model.displaySettingRef,
            resizePageFlag: model.resizePageFlag,
            panelElRef: model.panelElRef,
            move,
            bodyStyleState,
            scrollbarWidth,
        });
    }, [model, move]);

    const removeFixedPanel = useCallback(() => {
        return removeFixedPanelLayout(model.resizePageFlag, bodyStyleState);
    }, [model.resizePageFlag]);

    const updateBounds = useCallback(async () => {
        if (model.containerElRef.current) {
            await getDisplaySetting();
            let scrollLeft = document.documentElement.scrollLeft || document.body.scrollLeft;
            let scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
            model.moveablePanelRef.current?.setBounds({
                left: scrollLeft,
                top: scrollTop,
                right: scrollLeft + window.innerWidth - (hasScrollbar() ? scrollbarWidth : 0),
                bottom:
                    scrollTop +
                    (1 + model.displaySettingRef.current.floatingData.height) * window.innerHeight -
                    64,
            });
        }
    }, [getDisplaySetting, model.containerElRef, model.displaySettingRef, model.moveablePanelRef]);

    usePanelLifecycle({
        model,
        getDisplaySetting,
        updateDisplaySetting,
        updateBounds,
        showFloatingPanel,
        showFixedPanel,
        removeFixedPanel,
    });
}

function usePanelLifecycle(args) {
    const {
        model,
        getDisplaySetting,
        updateDisplaySetting,
        updateBounds,
        showFloatingPanel,
        showFixedPanel,
        removeFixedPanel,
    } = args;
    const modelRef = useLatest(model);
    const showFixedPanelRef = useLatest(showFixedPanel);
    const showFloatingPanelRef = useLatest(showFloatingPanel);
    const removeFixedPanelRef = useLatest(removeFixedPanel);
    const updateDisplaySettingRef = useLatest(updateDisplaySetting);
    const onDisplayStatusChangeRef = useRef();

    const showPanel = useCallback(async () => {
        await getDisplaySetting();
        updateBounds();
        if (model.displaySettingRef.current.type === "floating") {
            let position = resolveFloatingPanelPosition(
                model.contentRef.current,
                model.displaySettingRef.current.floatingData,
                scrollbarWidth
            );
            showFloatingPanel();
            model.moveablePanelRef.current.request("draggable", {
                x: position[0],
                y: position[1],
            });
        } else {
            await showFixedPanel();
        }
        model.setMoveableReady(true);
    }, [getDisplaySetting, model, showFixedPanel, showFloatingPanel, updateBounds]);
    const showPanelRef = useLatest(showPanel);

    const windowResizeHandler = useCallback(() => {
        updateBounds();
        if (!model.panelElRef.current) return;
        if (model.displaySettingRef.current.type === "fixed") void showFixedPanel();
        else showFloatingPanel();
    }, [
        model.displaySettingRef,
        model.panelElRef,
        showFixedPanel,
        showFloatingPanel,
        updateBounds,
    ]);

    model.onDisplayStatusChange = getDisplayStatusChangeHandler({
        modelRef,
        removeFixedPanelRef,
        showFixedPanelRef,
        showFloatingPanelRef,
        updateDisplaySettingRef,
        showPanelRef,
        onDisplayStatusChangeRef,
    });

    useEffect(() => {
        if (model.displaySettingRef.current.type === "floating") {
            setTimeout(showFloatingPanel, model.contentType === "LOADING" ? 0 : 100);
        }
    }, [model.contentType, model.displaySettingRef, showFloatingPanel]);

    usePanelScrollAutoClose(model, updateBounds);
    useEvent("resize", windowResizeHandler, window);
    useClickAway(model.containerElRef, () => {
        if (!model.panelFix) model.setOpen(false);
    });
}

function usePanelChannels(model) {
    useEffect(() => {
        initializePanelSettings(model);
        panelChannel.provide("check_availability", () => Promise.resolve());
        panelChannel.on("start_translating", (detail) => handleTranslating(model, detail));
        panelChannel.on("translating_finished", (detail) => handleTranslated(model, detail));
        panelChannel.on("translating_error", (detail) => handleTranslateError(model, detail));
        panelChannel.on(
            "update_translator_options",
            ({ availableTranslators, selectedTranslator }) => {
                model.setAvailableTranslators(availableTranslators);
                model.setCurrentTranslator(selectedTranslator);
            }
        );
        panelChannel.on("command", (detail) => handlePanelCommand(model, detail));
        const storageChangeHandler = (changes, area) =>
            syncPanelChangedSettings(model, changes, area);
        chrome.storage.onChanged.addListener(storageChangeHandler);
        return () => {
            chrome.storage.onChanged.removeListener(storageChangeHandler);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
}
