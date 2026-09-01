const AUTO_AVOID_POSITION = "AutoAvoid";
const AUTO_RECHECK_DELAYS = [0, 120, 300, 700, 1400];
const AUTO_OBSERVER_DURATION = 1600;
const EXTENSION_ELEMENT_SELECTOR =
    "#edge-translate-button, #edge-translate-button-host, #edge-translate-root, " +
    "#edge-translate-screenshot-overlay";

export function scheduleAutoAvoidRechecks(state, reposition) {
    cancelAutoAvoidRechecks(state);
    if (state.buttonPositionSetting !== AUTO_AVOID_POSITION) return;

    state.autoAvoidRecheckTimers = AUTO_RECHECK_DELAYS.map((delay) =>
        window.setTimeout(() => recheckPosition(state, reposition), delay)
    );
    observeAutoAvoidChanges(state, reposition);
}

export function cancelAutoAvoidRechecks(state) {
    for (const timer of state.autoAvoidRecheckTimers || []) window.clearTimeout(timer);
    state.autoAvoidRecheckTimers = [];
    state.autoAvoidObserver?.disconnect();
    state.autoAvoidObserver = null;
    window.clearTimeout(state.autoAvoidObserverStopTimer);
    state.autoAvoidObserverStopTimer = null;
    window.clearTimeout(state.autoAvoidMutationTimer);
    state.autoAvoidMutationTimer = null;
    window.clearTimeout(state.autoAvoidDirectionConfirmTimer);
    state.autoAvoidDirectionConfirmTimer = null;
    state.autoAvoidPendingDirection = null;
    state.autoAvoidPendingSince = null;
}

function observeAutoAvoidChanges(state, reposition) {
    if (typeof MutationObserver !== "function") return;

    state.autoAvoidObserver = new MutationObserver((mutations) => {
        if (mutations.every((mutation) => isExtensionElement(mutation.target))) return;
        scheduleMutationRecheck(state, reposition);
    });
    state.autoAvoidObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class", "style", "open", "popover"],
        childList: true,
        subtree: true,
    });
    state.autoAvoidObserverStopTimer = window.setTimeout(() => {
        state.autoAvoidObserver?.disconnect();
        state.autoAvoidObserver = null;
    }, AUTO_OBSERVER_DURATION);
}

function scheduleMutationRecheck(state, reposition) {
    if (state.autoAvoidMutationTimer !== null) return;

    state.autoAvoidMutationTimer = window.setTimeout(() => {
        state.autoAvoidMutationTimer = null;
        recheckPosition(state, reposition);
    }, 0);
}

function recheckPosition(state, reposition) {
    if (state.hasButtonShown && state.buttonPositionSetting === AUTO_AVOID_POSITION) reposition();
}

function isExtensionElement(node) {
    return node instanceof Element && Boolean(node.closest(EXTENSION_ELEMENT_SELECTOR));
}
