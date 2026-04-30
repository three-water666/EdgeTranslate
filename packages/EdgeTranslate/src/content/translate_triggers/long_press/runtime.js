// 负责初始化长按翻译触发器，监听设置变化并注册页面事件。
import { DEFAULT_SETTINGS, getOrSetDefaultSettings } from "common/scripts/settings.js";
import { cancelTextSelection, isInBlacklist, shouldTranslate } from "../shared/helpers.js";
import { createLongPressController } from "./controller.js";

export function createLongPressTrigger(options) {
    const controller = createLongPressController({
        cancelTextSelection,
        isInBlacklist,
        shouldTranslate,
        translateSelection: options.translateSelection,
    });

    return {
        initialize: () => initializeLongPressTrigger(controller),
    };
}

function initializeLongPressTrigger(controller) {
    initializeSettings(controller);
    registerDomEvents(controller);
}

function initializeSettings(controller) {
    getOrSetDefaultSettings("OtherSettings", DEFAULT_SETTINGS).then((result) => {
        controller.setEnabled(Boolean(result.OtherSettings?.TranslateAfterLongPress));
    });
    chrome.storage.onChanged.addListener((changes, area) =>
        syncLongPressSettings(controller, changes, area)
    );
}

function syncLongPressSettings(controller, changes, area) {
    if (area !== "sync" || !changes.OtherSettings) return;
    controller.setEnabled(Boolean(changes.OtherSettings.newValue?.TranslateAfterLongPress));
}

function registerDomEvents(controller) {
    window.addEventListener("DOMContentLoaded", () => initializeDomListeners(controller));
}

function initializeDomListeners(controller) {
    document.addEventListener("mousedown", (event) => controller.handleMouseDown(event), true);
    document.addEventListener("mousemove", (event) => controller.handleMouseMove(event), true);
    document.addEventListener("mouseup", (event) => controller.handleMouseUp(event), true);
    document.addEventListener("click", (event) => controller.handleClick(event), true);
    document.addEventListener("dragstart", () => controller.cancel(), true);
    window.addEventListener("blur", () => controller.cancel());
}
