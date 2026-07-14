import {
    LONG_PRESS_DURATION,
    LONG_PRESS_MOVE_THRESHOLD,
    LONG_PRESS_PREVIEW_DELAY,
} from "./select_constants.js";
import { snapshotSelection } from "./select_long_press_utils.js";

export function canStartLongPress(state, event) {
    return (
        state.longPressEnabled &&
        event.button === 0 &&
        event.clientX <= document.documentElement.clientWidth &&
        event.clientY <= document.documentElement.clientHeight &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !event.shiftKey &&
        !state.tools.isInNativeScrollbar(event) &&
        !state.tools.shouldIgnoreTarget(event.target)
    );
}

export function createLongPressSession(state, event, triggerTranslate) {
    return {
        startX: event.clientX,
        startY: event.clientY,
        initialSelection: snapshotSelection(window.getSelection()),
        moved: false,
        triggered: false,
        target: state.tools.getActionTarget(event.target),
        previewRange: null,
        previewTimer: window.setTimeout(
            () => previewLongPressRange(state),
            LONG_PRESS_PREVIEW_DELAY
        ),
        translateTimer: window.setTimeout(triggerTranslate, LONG_PRESS_DURATION),
    };
}

export function hasLongPressMoved(session, event) {
    return (
        Math.abs(event.clientX - session.startX) > LONG_PRESS_MOVE_THRESHOLD ||
        Math.abs(event.clientY - session.startY) > LONG_PRESS_MOVE_THRESHOLD
    );
}

export function shouldPreventLongPressClick(state, event) {
    if (!state.longPressPreventClickTarget || Date.now() > state.longPressPreventClickUntil) {
        state.longPressPreventClickTarget = null;
        state.longPressPreventClickUntil = 0;
        return false;
    }
    return (
        event.target instanceof Element &&
        (event.target === state.longPressPreventClickTarget ||
            state.longPressPreventClickTarget.contains(event.target) ||
            event.target.contains(state.longPressPreventClickTarget) ||
            event.composedPath?.().includes(state.longPressPreventClickTarget))
    );
}

export function cancelLongPressSession(state) {
    if (state.longPressSession?.previewTimer)
        window.clearTimeout(state.longPressSession.previewTimer);
    if (state.longPressSession?.translateTimer)
        window.clearTimeout(state.longPressSession.translateTimer);
    state.tools.clearHighlight();
    state.longPressSession = null;
}

export function finishLongPressMouseUp(state, event) {
    const session = state.longPressSession;
    cancelLongPressSession(state);
    if (!session || event.button !== 0 || !session.triggered) return;
    event.preventDefault();
}

function previewLongPressRange(state) {
    if (!state.longPressSession || state.longPressSession.moved) return;
    state.longPressSession.previewRange = state.tools.getRangeFromPoint(
        state.longPressSession.startX,
        state.longPressSession.startY
    );
    state.tools.renderHighlight(state.longPressSession.previewRange);
}
