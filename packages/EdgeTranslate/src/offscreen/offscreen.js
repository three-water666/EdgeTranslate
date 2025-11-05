import Channel from "common/scripts/channel.js";
import { HybridTranslator } from "@edge_translate/translators";

const channel = new Channel();

let HYBRID_TRANSLATOR;
let TRANSLATORS;

let initializationPromise = null;

async function doInitialization() {
    try {
        console.log("Offscreen: Woke up. Requesting config from Service Worker...");
        const configs = await channel.request("get_translator_config");
        if (!configs) {
            throw new Error("Failed to get config from Service Worker.");
        }
        HYBRID_TRANSLATOR = new HybridTranslator(configs.HybridTranslatorConfig, channel);
        TRANSLATORS = {
            HybridTranslate: HYBRID_TRANSLATOR,
            ...HYBRID_TRANSLATOR.REAL_TRANSLATORS,
        };
        console.log("Offscreen: New HybridTranslator instance created via request.");
    } catch (error) {
        console.error("Offscreen: Initialization failed.", error);
        initializationPromise = null;
        throw error;
    }
}

function initializeTranslator() {
    if (initializationPromise) {
        return initializationPromise;
    }
    initializationPromise = doInitialization();
    return initializationPromise;
}

channel.on("new_hybrid_translator_instance", (detail) => {
    if (HYBRID_TRANSLATOR) {
        return;
    }
    const { configs, channel } = detail;
    HYBRID_TRANSLATOR = new HybridTranslator(configs.HybridTranslatorConfig, channel);
    TRANSLATORS = {
        HybridTranslate: HYBRID_TRANSLATOR,
        ...HYBRID_TRANSLATOR.REAL_TRANSLATORS,
    };
    console.log("Offscreen: New HybridTranslator instance created.");
});

channel.on("hybrid_translator_use_config", async (detail) => {
    await initializeTranslator();
    HYBRID_TRANSLATOR.useConfig(detail);
});

channel.provide("hybrid_translator_get_available_translators", async (detail) => {
    await initializeTranslator();
    const result = HYBRID_TRANSLATOR.getAvailableTranslatorsFor(detail.from, detail.to);
    console.log("Offscreen: Available translators:", result);
    return Promise.resolve(result);
});

channel.provide("hybrid_translator_update_config", async (detail) => {
    await initializeTranslator();
    return Promise.resolve(HYBRID_TRANSLATOR.updateConfigFor(detail.from, detail.to));
});

channel.provide("translator_detect_by_default_translator", async (detail) => {
    await initializeTranslator();
    const { DEFAULT_TRANSLATOR, text } = detail;
    return Promise.resolve(TRANSLATORS[DEFAULT_TRANSLATOR].detect(text));
});

channel.provide("translator_by_default_translator", async (detail) => {
    await initializeTranslator();
    const { DEFAULT_TRANSLATOR, text, sl, tl } = detail;
    return Promise.resolve(TRANSLATORS[DEFAULT_TRANSLATOR].translate(text, sl, tl));
});

channel.provide("translator_pronounce_by_default_translator", async (detail) => {
    await initializeTranslator();
    const { DEFAULT_TRANSLATOR, text, lang, speed } = detail;
    return Promise.resolve(TRANSLATORS[DEFAULT_TRANSLATOR].pronounce(text, lang, speed));
});

channel.provide("translator_stop_pronounce_by_default_translator", async (detail) => {
    await initializeTranslator();
    const { DEFAULT_TRANSLATOR } = detail;
    return Promise.resolve(TRANSLATORS[DEFAULT_TRANSLATOR].stopPronounce());
});
