import { DEFAULT_SETTINGS, getOrSetDefaultSettings } from "common/scripts/settings.js";
import { isChromePDFViewer } from "../common.js";
import { panelChannel, checkTimestamp } from "./Panel.shared.js";
import { createMoveablePanel, attachDragHandlers, attachResizeHandlers } from "./Panel.runtime.js";

export function createDefaultDisplaySetting() {
    return {
        type: "fixed",
        fixedData: { width: 0.2, position: "right" },
        floatingData: { width: 0.15, height: 0.6 },
    };
}

export function normalizeDisplaySetting(displaySetting) {
    const defaultDisplaySetting = createDefaultDisplaySetting();
    const normalizedDisplaySetting = {
        ...defaultDisplaySetting,
        ...(displaySetting || {}),
        fixedData: {
            ...defaultDisplaySetting.fixedData,
            ...(displaySetting?.fixedData || {}),
        },
        floatingData: {
            ...defaultDisplaySetting.floatingData,
            ...(displaySetting?.floatingData || {}),
        },
    };

    normalizedDisplaySetting.type = normalizeDisplayType(
        normalizedDisplaySetting.type,
        defaultDisplaySetting.type
    );
    normalizedDisplaySetting.fixedData.position = normalizeFixedPosition(
        normalizedDisplaySetting.fixedData.position,
        defaultDisplaySetting.fixedData.position
    );
    normalizedDisplaySetting.fixedData.width = normalizeRatio(
        normalizedDisplaySetting.fixedData.width,
        defaultDisplaySetting.fixedData.width
    );
    normalizedDisplaySetting.floatingData.width = normalizeRatio(
        normalizedDisplaySetting.floatingData.width,
        defaultDisplaySetting.floatingData.width
    );
    normalizedDisplaySetting.floatingData.height = normalizeRatio(
        normalizedDisplaySetting.floatingData.height,
        defaultDisplaySetting.floatingData.height
    );

    return normalizedDisplaySetting;
}

function normalizeDisplayType(type, fallback) {
    return type === "fixed" || type === "floating" ? type : fallback;
}

function normalizeFixedPosition(position, fallback) {
    return position === "left" || position === "right" ? position : fallback;
}

function normalizeRatio(value, fallback) {
    return typeof value === "number" && value > 0 && value < 1 ? value : fallback;
}

export function initializePanelSettings(model) {
    getOrSetDefaultSettings(["languageSetting", "DefaultTranslator"], DEFAULT_SETTINGS).then(
        async (result) => {
            let availableTranslators = await panelChannel.request("get_available_translators", {
                from: result.languageSetting.sl,
                to: result.languageSetting.tl,
            });
            model.setAvailableTranslators(availableTranslators);
            model.setCurrentTranslator(result.DefaultTranslator);
        }
    );

    getOrSetDefaultSettings("fixSetting", DEFAULT_SETTINGS).then((result) => {
        model.setPanelFix(result.fixSetting);
    });
}

export function handleTranslating(model, detail) {
    if (!checkTimestamp(detail.timestamp)) return;
    window.translateResult.originalText = detail.text;
    model.setOpen(true);
    model.setContentType("LOADING");
    model.setContent(detail);
}

export function handleTranslated(model, detail) {
    if (!checkTimestamp(detail.timestamp)) return;
    window.translateResult = detail;
    model.setOpen(true);
    model.setContentType("RESULT");
    model.setContent(detail);
}

export function handleTranslateError(model, detail) {
    if (!checkTimestamp(detail.timestamp)) return;
    model.setContentType("ERROR");
    model.setContent(detail);
}

export function handlePanelCommand(model, detail) {
    switch (detail.command) {
        case "fix_result_frame":
            getOrSetDefaultSettings("fixSetting", DEFAULT_SETTINGS).then((result) => {
                model.setPanelFix(!result.fixSetting);
                chrome.storage.sync.set({ fixSetting: !result.fixSetting });
            });
            break;
        case "close_result_frame":
            model.setOpen(false);
            break;
        default:
            break;
    }
}

export function handleTranslatorSelect(model, eventKey) {
    model.setCurrentTranslator(eventKey);
    panelChannel.request("update_default_translator", { translator: eventKey }).then(() => {
        if (!window.translateResult.originalText) return;
        panelChannel.request("translate", { text: window.translateResult.originalText });
    });
}

export function togglePin(model) {
    model.setPanelFix(!model.panelFix);
    chrome.storage.sync.set({ fixSetting: !model.panelFix });
}

export function createPanelViewModel(model) {
    return {
        open: model.open,
        containerElRef: model.containerElRef,
        containerStyle: getContainerStyle(model.usePDFMaskLayer),
        onDisplayStatusChange: model.onDisplayStatusChange,
        displayType: model.displayType,
        moveableReady: model.moveableReady,
        headElRef: model.headElRef,
        simplebarRef: model.simplebarRef,
        contentType: model.contentType,
        content: model.content,
        currentTranslator: model.currentTranslator,
        availableTranslators: model.availableTranslators,
        panelFix: model.panelFix,
        onTranslatorSelect: (eventKey) => handleTranslatorSelect(model, eventKey),
        onOpenOptions: () => panelChannel.emit("open_options_page"),
        onTogglePin: () => togglePin(model),
        onClose: () => model.setOpen(false),
        highlight: model.highlight,
        highlightWidth: model.displaySettingRef.current.fixedData.width * window.innerWidth,
    };
}

export function handlePanelClosed(model, removeFixedPanel) {
    model.moveablePanelRef.current = null;
    model.setMoveableReady(false);
    window.isDisplayingResult = false;
    removeFixedPanel();
    if (isChromePDFViewer()) document.body.children[0].focus();
    panelChannel.emit("frame_closed");
}

export function handlePanelOpened(args) {
    const {
        model,
        panelEl,
        showFixedPanel,
        removeFixedPanel,
        showFloatingPanel,
        updateDisplaySetting,
        showPanel,
    } = args;

    window.isDisplayingResult = true;
    model.moveablePanelRef.current = createMoveablePanel(panelEl);
    attachDragHandlers({
        moveablePanel: model.moveablePanelRef.current,
        headElRef: model.headElRef,
        displaySettingRef: model.displaySettingRef,
        setUsePDFMaskLayer: model.setUsePDFMaskLayer,
        setHighlight: model.setHighlight,
        showFixedPanel,
        removeFixedPanel,
        showFloatingPanel,
        updateDisplaySetting,
    });
    attachResizeHandlers({
        moveablePanel: model.moveablePanelRef.current,
        displaySettingRef: model.displaySettingRef,
        resizePageFlag: model.resizePageFlag,
        setUsePDFMaskLayer: model.setUsePDFMaskLayer,
        updateDisplaySetting,
    });
    showPanel();
}

export function getContainerStyle(usePDFMaskLayer) {
    if (!usePDFMaskLayer) return {};
    const pdfRoot = document.body.children[0];
    if (!pdfRoot) return {};
    return {
        width: pdfRoot.clientWidth,
        height: pdfRoot.clientHeight,
        position: "fixed",
        zIndex: 2147483647,
    };
}
