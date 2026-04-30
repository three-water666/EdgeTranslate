import { executeGoogleScript } from "../page_translate/page_translate.js";

export function registerTranslationEvents({
    channel,
    translationState,
    translatorClient,
    translatorConfig,
    pronunciation,
}) {
    channel.on("translate_page_google", () => {
        executeGoogleScript(channel);
    });

    channel.on("language_setting_update", (detail) =>
        translatorConfig.onLanguageSettingUpdated(detail)
    );
    channel.on("frame_closed", () => pronunciation.stop());
    chrome.storage.onChanged.addListener((changes, area) => {
        handleTranslationStorageChanged({
            translationState,
            translatorClient,
            changes,
            area,
        });
    });
}

async function handleTranslationStorageChanged({
    translationState,
    translatorClient,
    changes,
    area,
}) {
    if (area !== "sync") {
        return;
    }

    await translationState.ready();

    if (changes["HybridTranslatorConfig"]) {
        await translatorClient.useConfig(changes["HybridTranslatorConfig"].newValue);
    }

    translationState.applyStorageChanges(changes);
}
