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
