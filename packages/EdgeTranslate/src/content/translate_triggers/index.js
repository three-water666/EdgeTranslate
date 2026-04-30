import { isNativePDFViewer } from "../common.js";
import Channel from "common/scripts/channel.js";
import { createLongPressTrigger } from "./long_press/runtime.js";
import { createScreenshotSelector } from "./screenshot/selector.js";
import { cancelPageTranslate, getSelection } from "./shared/helpers.js";
import { createTextActions } from "./shared/text_actions.js";
import { createTextSelectionTrigger } from "./text_selection/runtime.js";

if (!isNativePDFViewer()) {
    initTranslateTriggers();
}

function initTranslateTriggers() {
    const channel = new Channel();
    const textActions = createTextActions({ channel });
    const screenshotSelector = createScreenshotSelector();
    const textSelectionTrigger = createTextSelectionTrigger({ textActions });
    const longPressTrigger = createLongPressTrigger({
        translateSelection: () => textActions.translate(),
    });

    textSelectionTrigger.initialize();
    longPressTrigger.initialize();
    registerSelectionServices(channel);
    registerScreenshotServices(channel, screenshotSelector);
    registerCommandHandlers(channel, textActions);
}

function registerSelectionServices(channel) {
    channel.provide("get_selection", () => Promise.resolve(getSelection()));
}

function registerScreenshotServices(channel, screenshotSelector) {
    if (window.top === window) {
        channel.provide("select_capture_area", () => Promise.resolve(screenshotSelector.start()));
    }
}

function registerCommandHandlers(channel, textActions) {
    channel.on("command", (detail) => handleCommand(textActions, detail));
}

function handleCommand(textActions, detail) {
    switch (detail.command) {
        case "translate_selected":
            textActions.translate();
            break;
        case "pronounce_selected":
            textActions.pronounce();
            break;
        case "cancel_page_translate":
            cancelPageTranslate();
            break;
        default:
            break;
    }
}
