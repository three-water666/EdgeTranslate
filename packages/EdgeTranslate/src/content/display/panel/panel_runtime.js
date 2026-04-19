import Moveable from "../library/moveable/moveable.js";
import { delayPromise } from "common/scripts/promise.js";
import { DEFAULT_SETTINGS, getOrSetDefaultSettings } from "common/scripts/settings.js";
import { isChromePDFViewer } from "../../common.js";

const transitionDuration = 500;

export function getScrollbarWidth() {
    let scrollDiv = document.createElement("div");
    scrollDiv.style.cssText =
        "width: 99px; height: 99px; overflow: scroll; position: absolute; top: -9999px;";
    document.documentElement.appendChild(scrollDiv);
    let scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;
    document.documentElement.removeChild(scrollDiv);
    return scrollbarWidth;
}

export function hasScrollbar() {
    return (
        document.body.scrollHeight > (window.innerHeight || document.documentElement.clientHeight)
    );
}

export function createMoveablePanel(panelEl) {
    return new Moveable(panelEl, {
        draggable: true,
        resizable: true,
        threshold: 5,
        thresholdPosition: 0.7,
        minWidth: 180,
        minHeight: 150,
    });
}

export function attachDragHandlers({
    moveablePanel,
    headElRef,
    displaySettingRef,
    setUsePDFMaskLayer,
    setHighlight,
    showFixedPanel,
    removeFixedPanel,
    showFloatingPanel,
    updateDisplaySetting,
}) {
    let startTranslate = [0, 0];
    let floatingToFixed = false;
    let fixedDirection = "";

    moveablePanel
        .on("dragStart", ({ set, stop, inputEvent }) => {
            if (!canStartDragging(inputEvent, headElRef.current)) {
                stop();
                return;
            }
            startTranslate = getCurrentTranslate(moveablePanel.targetElement);
            set(startTranslate);
            if (isChromePDFViewer()) setUsePDFMaskLayer(true);
        })
        .on("drag", ({ target, translate }) => {
            startTranslate = translate;
            target.style.transform = `translate(${translate[0]}px, ${translate[1]}px)`;
        })
        .on("dragEnd", ({ translate, inputEvent }) => {
            startTranslate = translate;
            if (shouldFixPanel(inputEvent, displaySettingRef.current.type, floatingToFixed)) {
                displaySettingRef.current.fixedData.position = fixedDirection;
                displaySettingRef.current.type = "fixed";
                resetHighlight(setHighlight);
                showFixedPanel();
                updateDisplaySetting();
            }
            setUsePDFMaskLayer(false);
        })
        .on("bound", ({ direction, distance }) => {
            if (!shouldShowFixedHighlight(displaySettingRef.current.type, direction, distance)) {
                return;
            }
            fixedDirection = direction;
            floatingToFixed = true;
            setHighlight({ show: true, position: direction });
        })
        .on("boundEnd", () => {
            if (floatingToFixed) resetHighlight(setHighlight);
            floatingToFixed = false;
            if (displaySettingRef.current.type !== "fixed") return;
            displaySettingRef.current.type = "floating";
            removeFixedPanel();
            showFloatingPanel();
            updateDisplaySetting();
            setTimeout(showFloatingPanel, 50);
        });
}

export function attachResizeHandlers({
    moveablePanel,
    displaySettingRef,
    resizePageFlag,
    setUsePDFMaskLayer,
    updateDisplaySetting,
}) {
    let startTranslate = [0, 0];

    moveablePanel
        .on("resizeStart", ({ set }) => {
            startTranslate = getCurrentTranslate(moveablePanel.targetElement);
            set(startTranslate);
            if (isChromePDFViewer()) setUsePDFMaskLayer(true);
        })
        .on("resize", ({ target, width, height, translate, inputEvent }) => {
            startTranslate = translate;
            target.style.width = `${width}px`;
            target.style.height = `${height}px`;
            target.style.transform = `translate(${translate[0]}px, ${translate[1]}px)`;
            if (shouldResizePage(inputEvent, displaySettingRef.current.type, resizePageFlag)) {
                document.body.style.width = `${(1 - width / window.innerWidth) * 100}%`;
            }
        })
        .on("resizeEnd", ({ width, height, translate, inputEvent, target }) => {
            startTranslate = translate;
            target.style.transform = `translate(${translate[0]}px, ${translate[1]}px)`;
            if (inputEvent) {
                updateResizedDisplayData(displaySettingRef.current, width, height);
                updateDisplaySetting();
            }
            setUsePDFMaskLayer(false);
        });
}

export function resolveFloatingPanelPosition(content, floatingData, scrollbarWidth) {
    let width = floatingData.width * window.innerWidth;
    let height = floatingData.height * window.innerHeight;
    if (!content.position) {
        return [
            (1 - floatingData.width) * window.innerWidth - (hasScrollbar() ? scrollbarWidth : 0),
            0,
        ];
    }

    const xBias = 20;
    const yBias = 20;
    const threshold = height / 4;
    let position = [content.position[0], content.position[1]];

    if (position[0] + width > window.innerWidth) {
        position[0] = position[0] - width - xBias;
    }
    if (position[1] + height > window.innerHeight + threshold) {
        let nextY = position[1] - height - yBias + threshold;
        position[1] = nextY < 0 ? 0 : nextY;
    }
    return [position[0] + xBias, position[1] + yBias];
}

export function resizeFloatingPanel({
    moveablePanel,
    displaySettingRef,
    contentType,
    headEl,
    simplebar,
}) {
    if (!moveablePanel) return;
    let panelHeight = displaySettingRef.current.floatingData.height * window.innerHeight;
    if (contentType === "RESULT" || contentType === "ERROR") {
        const headHeight = headEl?.clientHeight || 0;
        const contentHeight = simplebar?.getContentElement?.()?.clientHeight || 0;
        const actualHeight = headHeight + contentHeight;
        if (headHeight > 0 && actualHeight !== headHeight && panelHeight > actualHeight) {
            panelHeight = actualHeight;
        }
    }
    moveablePanel.request("resizable", {
        width: displaySettingRef.current.floatingData.width * window.innerWidth,
        height: panelHeight,
    });
}

export async function applyFixedPanelLayout({
    displaySettingRef,
    resizePageFlag,
    panelElRef,
    move,
    bodyStyleState,
    scrollbarWidth,
}) {
    if (!panelElRef.current) return;
    let width = displaySettingRef.current.fixedData.width * window.innerWidth;
    let offsetLeft = getFixedOffsetLeft(
        displaySettingRef.current.fixedData.position,
        width,
        scrollbarWidth
    );
    let result = await getOrSetDefaultSettings("LayoutSettings", DEFAULT_SETTINGS);
    resizePageFlag.current = result.LayoutSettings.Resize;

    if (!resizePageFlag.current) return move(width, window.innerHeight, offsetLeft, 0);

    await prepareFixedPanelLayout({
        bodyStyleState,
        displaySettingRef,
        panelElRef,
        move,
        offsetLeft,
        width,
    });
}

export async function removeFixedPanelLayout(resizePageFlag, bodyStyleState) {
    if (!resizePageFlag.current) return;
    document.body.style.transition = `width ${transitionDuration}ms`;
    await delayPromise(50);
    document.body.style.width = "100%";
    await delayPromise(transitionDuration);
    document.body.style.cssText = bodyStyleState.cssText;
    bodyStyleState.cssText = "";
}

function canStartDragging(inputEvent, headEl) {
    if (!inputEvent) return true;
    const path = inputEvent.path || (inputEvent.composedPath && inputEvent.composedPath());
    return !!path && headEl?.isSameNode(path[0]);
}

function shouldFixPanel(inputEvent, displayType, floatingToFixed) {
    return !!inputEvent && displayType === "floating" && floatingToFixed;
}

function shouldShowFixedHighlight(displayType, direction, distance) {
    return (
        displayType === "floating" &&
        distance > 10 &&
        (direction === "left" || direction === "right")
    );
}

function resetHighlight(setHighlight) {
    setHighlight({ show: false, position: "right" });
}

function shouldResizePage(inputEvent, displayType, resizePageFlag) {
    return !!inputEvent && displayType === "fixed" && resizePageFlag.current;
}

function updateResizedDisplayData(displaySetting, width, height) {
    if (displaySetting.type === "floating") {
        displaySetting.floatingData.width = width / window.innerWidth;
        displaySetting.floatingData.height = height / window.innerHeight;
        return;
    }
    displaySetting.fixedData.width = width / window.innerWidth;
}

function getFixedOffsetLeft(position, width, scrollbarWidth) {
    if (position !== "right") return 0;
    return window.innerWidth - width - (hasScrollbar() ? scrollbarWidth : 0);
}

function getCurrentTranslate(targetElement) {
    if (!targetElement) return [0, 0];
    const transform =
        targetElement.style.transform || window.getComputedStyle(targetElement).transform;
    if (!transform || transform === "none") return [0, 0];

    return parseMatrixTranslate(transform) || parseTranslateValues(transform) || [0, 0];
}

function parseMatrixTranslate(transform) {
    const matrixMatch = transform.match(/matrix\(([^)]+)\)/);
    if (!matrixMatch) return null;
    const values = matrixMatch[1].split(",").map((value) => Number.parseFloat(value.trim()));
    return [values[4] || 0, values[5] || 0];
}

function parseTranslateValues(transform) {
    const translateMatch = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
    if (!translateMatch) return null;
    return [Number.parseFloat(translateMatch[1]) || 0, Number.parseFloat(translateMatch[2]) || 0];
}

async function prepareResizableBody({ bodyStyleState, panelElRef, move, offsetLeft }) {
    if (bodyStyleState.cssText !== "" || !panelElRef.current) return;
    bodyStyleState.cssText = document.body.style.cssText;
    document.body.style.position = "absolute";
    document.body.style.transition = `width ${transitionDuration}ms`;
    panelElRef.current.style.transition = `width ${transitionDuration}ms`;
    document.body.style.width = "100%";
    move(0, window.innerHeight, offsetLeft, 0);
    await delayPromise(50);
}

async function prepareFixedPanelLayout({
    bodyStyleState,
    displaySettingRef,
    panelElRef,
    move,
    offsetLeft,
    width,
}) {
    await prepareResizableBody({ bodyStyleState, panelElRef, move, offsetLeft });
    if (!panelElRef.current) return;
    applyFixedBodySide(displaySettingRef.current.fixedData.position);
    document.body.style.width = `${(1 - displaySettingRef.current.fixedData.width) * 100}%`;
    move(width, window.innerHeight, offsetLeft, 0);
    await delayPromise(transitionDuration);
    if (!panelElRef.current) return;
    panelElRef.current.style.transition = "";
    document.body.style.transition = "";
}

function applyFixedBodySide(position) {
    if (position === "left") {
        document.body.style.right = "0";
        document.body.style.left = "";
        return;
    }
    document.body.style.margin = "0";
    document.body.style.right = "";
    document.body.style.left = "0";
}
