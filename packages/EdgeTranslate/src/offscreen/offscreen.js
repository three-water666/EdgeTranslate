import Channel from "common/scripts/channel.js";
import { HybridTranslator } from "@edge_translate/translators";

const channel = new Channel();

let HYBRID_TRANSLATOR;
let TRANSLATORS;

channel.on("new_hybrid_translator_instance", (detail) => {
    if (HYBRID_TRANSLATOR) {
        return;
    }
    const { configs, channel } = detail;
    HYBRID_TRANSLATOR = new HybridTranslator(configs.HybridTranslatorConfig, channel);
    TRANSLATORS = {
        HybridTranslator: HYBRID_TRANSLATOR,
        ...HYBRID_TRANSLATOR.REAL_TRANSLATORS,
    };
    console.log("Offscreen: New HybridTranslator instance created.");
});

channel.on("hybrid_translator_use_config", (detail) => {
    HYBRID_TRANSLATOR.useConfig(detail);
});

channel.provide("hybrid_translator_get_available_translators", (detail) => {
    return Promise.resolve(HYBRID_TRANSLATOR.getAvailableTranslatorsFor(detail.from, detail.to));
});

channel.provide("hybrid_translator_update_config", (detail) => {
    return Promise.resolve(HYBRID_TRANSLATOR.updateConfigFor(detail.from, detail.to));
});

channel.provide("translator_detect_by_default_translator", async (detail) => {
    const { DEFAULT_TRANSLATOR, text } = detail;
    return Promise.resolve(TRANSLATORS[DEFAULT_TRANSLATOR].detect(text));
});

channel.provide("translator_by_default_translator", async (detail) => {
    const { DEFAULT_TRANSLATOR, text, sl, tl } = detail;
    return Promise.resolve(TRANSLATORS[DEFAULT_TRANSLATOR].translate(text, sl, tl));
});

channel.provide("translator_pronounce_by_default_translator", async (detail) => {
    const { DEFAULT_TRANSLATOR, text, lang, speed } = detail;
    return Promise.resolve(TRANSLATORS[DEFAULT_TRANSLATOR].pronounce(text, lang, speed));
});

channel.provide("translator_stop_pronounce_by_default_translator", async (detail) => {
    const { DEFAULT_TRANSLATOR } = detail;
    return Promise.resolve(TRANSLATORS[DEFAULT_TRANSLATOR].stopPronounce());
});
