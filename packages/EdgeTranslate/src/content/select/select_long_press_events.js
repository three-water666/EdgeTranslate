export function finishLongPressMouseUp(state, event, cancelLongPressSession) {
    const session = state.longPressSession;
    cancelLongPressSession(state);
    if (!session || event.button !== 0 || !session.triggered) return;
    event.preventDefault();
}
