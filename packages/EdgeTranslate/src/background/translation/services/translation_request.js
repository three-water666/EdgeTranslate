export function submitTranslationRequest(textTranslation, request) {
    const { tabId, text, position, options = {} } = request;

    if (tabId !== null && tabId !== undefined) {
        return textTranslation.translateOnTabWithOptions({
            tabId,
            text,
            position,
            options,
        });
    }

    return textTranslation.translate(text, position, options);
}
