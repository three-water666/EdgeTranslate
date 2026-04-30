import { DEFAULT_SETTINGS, getOrSetDefaultSettings } from "common/scripts/settings.js";
import { submitTranslationRequest } from "../services/translation_request.js";

export function registerTranslationChannelServices({
    channel,
    textTranslation,
    pronunciation,
    translatorConfig,
    screenshotTranslation,
}) {
    channel.provide("translate", (params) =>
        submitTranslationRequest(textTranslation, {
            text: params.text,
            position: params.position,
            options: {
                defaultTranslator: params.translator,
            },
        })
    );

    channel.provide("pronounce", (params) => pronunciation.pronounce(params));

    channel.provide("get_available_translators", (params) =>
        translatorConfig.getAvailableTranslators(params)
    );

    channel.provide("update_default_translator", (detail) =>
        translatorConfig.updateDefaultTranslator(detail.translator)
    );

    channel.provide("get_translator_config", async () => {
        return getOrSetDefaultSettings(["HybridTranslatorConfig"], DEFAULT_SETTINGS);
    });

    channel.provide("screenshot_translate", () => screenshotTranslation.run());
}
