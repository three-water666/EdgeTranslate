const AUTO_AVOID_POSITION = "AutoAvoid";
const AUTO_AVOID_DIRECTION_CONFIRM_DELAY = 50;
const DUPLICATE_SELECTION_WINDOW = 250;

export function isDuplicateButtonRequest(state, selection, anchor) {
    return (
        state.hasButtonShown &&
        state.buttonSelection?.text === selection.text &&
        Date.now() - state.buttonShownAt <= DUPLICATE_SELECTION_WINDOW &&
        areButtonAnchorsEqual(state.buttonAnchor, anchor)
    );
}

export function shiftButtonAnchor(anchor, distanceX, distanceY) {
    if (!anchor) return;
    anchor.x += distanceX;
    anchor.y += distanceY;
    if (!anchor.selectionRect) return;
    anchor.selectionRect = {
        bottom: anchor.selectionRect.bottom + distanceY,
        left: anchor.selectionRect.left + distanceX,
        right: anchor.selectionRect.right + distanceX,
        top: anchor.selectionRect.top + distanceY,
    };
}

export function shouldDeferDirectionChange(state, placement, isRecheck, confirmDirectionChange) {
    if (!isDirectionChangeRequiringConfirmation(state, placement, isRecheck)) return false;

    const now = Date.now();
    if (state.autoAvoidPendingDirection !== placement.direction) {
        state.autoAvoidPendingDirection = placement.direction;
        state.autoAvoidPendingSince = now;
    }
    const elapsed = now - state.autoAvoidPendingSince;
    if (elapsed >= AUTO_AVOID_DIRECTION_CONFIRM_DELAY) return false;

    window.clearTimeout(state.autoAvoidDirectionConfirmTimer);
    state.autoAvoidDirectionConfirmTimer = window.setTimeout(() => {
        state.autoAvoidDirectionConfirmTimer = null;
        if (state.hasButtonShown) confirmDirectionChange();
    }, AUTO_AVOID_DIRECTION_CONFIRM_DELAY - elapsed);
    return true;
}

export function clearPendingDirectionChange(state) {
    window.clearTimeout(state.autoAvoidDirectionConfirmTimer);
    state.autoAvoidDirectionConfirmTimer = null;
    state.autoAvoidPendingDirection = null;
    state.autoAvoidPendingSince = null;
}

function areButtonAnchorsEqual(first, second) {
    if (!first || !second) return false;
    if (first.selectionRect || second.selectionRect) {
        if (!first.selectionRect || !second.selectionRect) return false;
        return ["bottom", "left", "right", "top"].every(
            (property) =>
                Math.abs(first.selectionRect[property] - second.selectionRect[property]) <= 1
        );
    }
    return Math.abs(first.x - second.x) <= 4 && Math.abs(first.y - second.y) <= 4;
}

function isDirectionChangeRequiringConfirmation(state, placement, isRecheck) {
    return (
        isRecheck &&
        state.buttonPositionSetting === AUTO_AVOID_POSITION &&
        Boolean(state.buttonPlacementDirection) &&
        placement.direction !== state.buttonPlacementDirection
    );
}
