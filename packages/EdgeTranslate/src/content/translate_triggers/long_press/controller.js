import {
    LONG_PRESS_DURATION,
    LONG_PRESS_MOVE_THRESHOLD,
    LONG_PRESS_PREVIEW_DELAY,
} from "../shared/constants.js";
import { createLongPressTools } from "./tools.js";

export function createLongPressController(options) {
    const state = createControllerState(options);
    return {
        cancel: () => cancelLongPressSession(state),
        handleClick: (event) => handleLongPressClick(state, event),
        handleMouseDown: (event) => handleLongPressMouseDown(state, event),
        handleMouseMove: (event) => handleLongPressMouseMove(state, event),
        handleMouseUp: (event) => handleLongPressMouseUp(state, event),
        setEnabled: (enabled) => setLongPressEnabled(state, enabled),
    };
}

function createControllerState(options) {
    return {
        enabled: false,
        session: null,
        clickGuardTarget: null,
        clickGuardUntil: 0,
        tools: options.tools || createLongPressTools(),
        cancelTextSelection: options.cancelTextSelection,
        isInBlacklist: options.isInBlacklist,
        shouldTranslate: options.shouldTranslate,
        translateSelection: options.translateSelection,
    };
}

function setLongPressEnabled(state, enabled) {
    state.enabled = Boolean(enabled);
    if (!state.enabled) cancelLongPressSession(state);
}

function handleLongPressMouseDown(state, event) {
    if (!canStartLongPress(state, event)) {
        cancelLongPressSession(state);
        return;
    }
    if (window.getSelection().toString().trim()) state.cancelTextSelection();
    state.session = createLongPressSession(state, event);
}

function handleLongPressMouseMove(state, event) {
    if (!state.session) return;
    if (!hasLongPressMoved(state.session, event)) return;
    state.session.moved = true;
    state.tools.clearHighlight();
}

function handleLongPressMouseUp(state, event) {
    const finishedSession = state.session;
    cancelLongPressSession(state);
    if (!shouldConsumeMouseUp(finishedSession, event)) return;
    event.preventDefault();
}

function handleLongPressClick(state, event) {
    if (!shouldPreventLongPressClick(state, event)) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    clearClickGuard(state);
}

function cancelLongPressSession(state) {
    clearSessionTimers(state.session);
    state.tools.clearHighlight();
    state.session = null;
}

function clearSessionTimers(session) {
    if (!session) return;
    if (session.previewTimer) window.clearTimeout(session.previewTimer);
    if (session.translateTimer) window.clearTimeout(session.translateTimer);
}

function createLongPressSession(state, event) {
    const session = createSessionSnapshot(state, event);
    session.previewTimer = window.setTimeout(
        () => previewLongPressRange(state, session),
        LONG_PRESS_PREVIEW_DELAY
    );
    session.translateTimer = window.setTimeout(
        () => triggerLongPressTranslate(state, session),
        LONG_PRESS_DURATION
    );
    return session;
}

function createSessionSnapshot(state, event) {
    return {
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
        triggered: false,
        target: state.tools.getActionTarget(event.target),
        previewRange: null,
        previewTimer: null,
        translateTimer: null,
    };
}

function previewLongPressRange(state, session) {
    if (!canUseSession(state, session)) return;
    session.previewRange = state.tools.getRangeFromPoint(session.startX, session.startY);
    state.tools.renderHighlight(session.previewRange);
}

function triggerLongPressTranslate(state, session) {
    if (!canUseSession(state, session)) return Promise.resolve();
    if (window.getSelection().toString().trim()) return Promise.resolve();
    return state.isInBlacklist().then((inBlacklist) => {
        finishLongPressTranslate(state, session, inBlacklist);
    });
}

function finishLongPressTranslate(state, session, inBlacklist) {
    if (inBlacklist || !canUseSession(state, session)) return;
    if (!selectTextAtPoint(state, session) || !state.shouldTranslate()) return;
    session.triggered = true;
    armClickGuard(state, session);
    state.tools.clearHighlight();
    state.translateSelection();
}

function selectTextAtPoint(state, session) {
    const range =
        session.previewRange?.cloneRange() ||
        state.tools.getRangeFromPoint(session.startX, session.startY);
    if (!range || range.collapsed) return false;
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    return selection.toString().trim().length > 0;
}

function canStartLongPress(state, event) {
    return (
        state.enabled &&
        event.button === 0 &&
        isWithinViewport(event) &&
        !hasModifierKey(event) &&
        !state.tools.shouldIgnoreTarget(event.target)
    );
}

function isWithinViewport(event) {
    return (
        event.clientX <= document.documentElement.clientWidth &&
        event.clientY <= document.documentElement.clientHeight
    );
}

function hasModifierKey(event) {
    return event.ctrlKey || event.metaKey || event.altKey || event.shiftKey;
}

function hasLongPressMoved(session, event) {
    return (
        Math.abs(event.clientX - session.startX) > LONG_PRESS_MOVE_THRESHOLD ||
        Math.abs(event.clientY - session.startY) > LONG_PRESS_MOVE_THRESHOLD
    );
}

function shouldConsumeMouseUp(session, event) {
    return Boolean(session && event.button === 0 && session.triggered);
}

function canUseSession(state, session) {
    return Boolean(state.enabled && session && state.session === session && !session.moved);
}

function armClickGuard(state, session) {
    state.clickGuardTarget =
        session.target ||
        state.tools.getActionTarget(document.elementFromPoint(session.startX, session.startY));
    state.clickGuardUntil = Date.now() + 1000;
}

function shouldPreventLongPressClick(state, event) {
    if (!isClickGuardActive(state)) {
        clearClickGuard(state);
        return false;
    }
    return isClickTargetGuarded(state, event);
}

function isClickGuardActive(state) {
    return Boolean(state.clickGuardTarget) && Date.now() <= state.clickGuardUntil;
}

function isClickTargetGuarded(state, event) {
    if (!(event.target instanceof Element)) return false;
    return targetsMatch(event.target, state.clickGuardTarget, event);
}

function targetsMatch(eventTarget, guardedTarget, event) {
    return (
        eventTarget === guardedTarget ||
        guardedTarget.contains(eventTarget) ||
        eventTarget.contains(guardedTarget) ||
        event.composedPath?.().includes(guardedTarget)
    );
}

function clearClickGuard(state) {
    state.clickGuardTarget = null;
    state.clickGuardUntil = 0;
}
