export function resolveContextMenuSelection(info, selection = null) {
    const browserSelectionText = info.selectionText?.trim();

    if (browserSelectionText) {
        return {
            text: browserSelectionText,
            position: selection?.position || null,
        };
    }

    if (selection?.text?.trim()) {
        return {
            text: selection.text.trim(),
            position: selection.position || null,
        };
    }

    return null;
}
