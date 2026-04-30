import { ensureOffscreenDocument } from "../../offscreen/document.js";

export function createOffscreenTranslatorClient(channel) {
    async function request(service, params) {
        await ensureOffscreenDocument();
        return channel.request(service, params);
    }

    return {
        ensureReady() {
            return ensureOffscreenDocument();
        },

        detect(defaultTranslator, text) {
            return request("translator_detect_by_default_translator", {
                DEFAULT_TRANSLATOR: defaultTranslator,
                text,
            });
        },

        translate(defaultTranslator, text, sourceLanguage, targetLanguage) {
            return request("translator_by_default_translator", {
                DEFAULT_TRANSLATOR: defaultTranslator,
                text,
                sl: sourceLanguage,
                tl: targetLanguage,
            });
        },

        pronounce(defaultTranslator, text, language, speed) {
            return request("translator_pronounce_by_default_translator", {
                DEFAULT_TRANSLATOR: defaultTranslator,
                text,
                lang: language,
                speed,
            });
        },

        stopPronounce(defaultTranslator) {
            return request("translator_stop_pronounce_by_default_translator", {
                DEFAULT_TRANSLATOR: defaultTranslator,
            });
        },

        async getAvailableTranslators(detail) {
            const availableTranslators = await request(
                "hybrid_translator_get_available_translators",
                detail
            );
            return ["HybridTranslate"].concat(availableTranslators);
        },

        updateConfig(detail) {
            return request("hybrid_translator_update_config", detail);
        },

        async useConfig(config) {
            await ensureOffscreenDocument();
            channel.emit("hybrid_translator_use_config", config);
        },
    };
}
