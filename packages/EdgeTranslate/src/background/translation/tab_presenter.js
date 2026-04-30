export function createTranslationTabPresenter(channel) {
    return {
        sendCommand(tabId, command) {
            channel.emitToTabs(tabId, "command", {
                command,
            });
        },

        startTranslating(tabId, detail) {
            channel.emitToTabs(tabId, "start_translating", detail);
        },

        translatingFinished(tabId, detail) {
            channel.emitToTabs(tabId, "translating_finished", detail);
        },

        translatingError(tabId, detail) {
            channel.emitToTabs(tabId, "translating_error", detail);
        },

        startPronouncing(tabId, detail) {
            channel.emitToTabs(tabId, "start_pronouncing", detail);
        },

        pronouncingFinished(tabId, detail) {
            channel.emitToTabs(tabId, "pronouncing_finished", detail);
        },

        pronouncingError(tabId, detail) {
            channel.emitToTabs(tabId, "pronouncing_error", detail);
        },

        updateTranslatorOptions(tabId, detail) {
            channel.emitToTabs(tabId, "update_translator_options", detail);
        },
    };
}
