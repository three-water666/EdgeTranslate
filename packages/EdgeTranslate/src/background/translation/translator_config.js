import { promiseTabs } from "common/scripts/promise.js";

export function createTranslatorConfigService({ state, translatorClient, channel, tabPresenter }) {
    async function getAvailableTranslators(detail) {
        return translatorClient.getAvailableTranslators(detail);
    }

    async function onLanguageSettingUpdated(detail) {
        await state.ready();
        let selectedTranslator = state.defaultTranslator;

        const availableTranslators = await getAvailableTranslators(detail);
        const newConfig = await translatorClient.updateConfig(detail);
        chrome.storage.sync.set({ HybridTranslatorConfig: newConfig });

        if (!new Set(availableTranslators).has(selectedTranslator)) {
            selectedTranslator = availableTranslators[1];
            state.defaultTranslator = selectedTranslator;
            chrome.storage.sync.set({ DefaultTranslator: selectedTranslator });
        }

        channel.emit("hybrid_translator_config_updated", {
            config: newConfig,
            availableTranslators: availableTranslators.slice(1),
        });

        promiseTabs.query({ active: true, currentWindow: true }).then((tabs) =>
            tabPresenter.updateTranslatorOptions(tabs[0].id, {
                selectedTranslator,
                availableTranslators,
            })
        );
    }

    async function updateDefaultTranslator(translator) {
        await state.ready();
        return state.updateDefaultTranslator(translator);
    }

    return {
        getAvailableTranslators,
        onLanguageSettingUpdated,
        updateDefaultTranslator,
    };
}
