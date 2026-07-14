export function createPanelDragShieldController(dragShieldElRef) {
    let active = false;

    return {
        activate(inputEvent, cursor) {
            if (!inputEvent) return false;
            active = true;
            activatePanelDragShield(dragShieldElRef, inputEvent, cursor);
            return true;
        },
        deactivate(inputEvent, canceled = false) {
            if (!active || (!inputEvent && !canceled)) return false;
            active = false;
            setPanelDragShield(dragShieldElRef, false);
            return true;
        },
    };
}

export function activatePanelDragShield(dragShieldElRef, inputEvent, cursor) {
    if (!inputEvent) return;
    setPanelDragShield(
        dragShieldElRef,
        true,
        cursor || getInteractionCursor(inputEvent, "default")
    );
}

export function setPanelDragShield(dragShieldElRef, active, cursor = "") {
    const dragShield = dragShieldElRef?.current;
    if (!dragShield) return;

    dragShield.style.pointerEvents = active ? "auto" : "none";
    dragShield.style.cursor = active ? cursor : "";
}

function getInteractionCursor(inputEvent, fallback) {
    if (!inputEvent.target) return fallback;
    return window.getComputedStyle(inputEvent.target).cursor || fallback;
}
