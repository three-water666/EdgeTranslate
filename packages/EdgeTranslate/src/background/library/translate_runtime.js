import { DEFAULT_SETTINGS, getOrSetDefaultSettings } from "common/scripts/settings.js";
import { executeGoogleScript } from "./page_translate.js";

function provideTranslatorServices(manager) {
    manager.channel.provide("translate", (params) =>
        manager.translate(params.text, params.position)
    );

    manager.channel.provide("pronounce", (params) => {
        let speed = params.speed;
        if (!speed) {
            speed = manager.TTS_SPEED;
            manager.TTS_SPEED = speed === "fast" ? "slow" : "fast";
        }

        return manager.pronounce(params.pronouncing, params.text, params.language, speed);
    });

    manager.channel.provide("get_available_translators", (params) =>
        manager.getAvailableTranslators(params)
    );

    manager.channel.provide("update_default_translator", (detail) =>
        manager.updateDefaultTranslator(detail.translator)
    );

    manager.channel.provide("get_translator_config", async () => {
        const configs = await getOrSetDefaultSettings(["HybridTranslatorConfig"], DEFAULT_SETTINGS);
        return Promise.resolve(configs);
    });

    provideOcrServices(manager);
    manager.channel.provide("screenshot_translate", () => manager.screenshotTranslate());
}

function provideOcrServices(manager) {
    manager.channel.provide("get_ocr_settings", async () => {
        const configs = await getOrSetDefaultSettings(["OCRSettings"], DEFAULT_SETTINGS);
        return Promise.resolve(configs.OCRSettings);
    });

    [
        "get_ocr_download_status",
        "download_ocr_languages",
        "delete_ocr_languages",
        "cancel_ocr_language_downloads",
    ].forEach((serviceName) => {
        const eventName = OCR_SERVICE_EVENT_MAP[serviceName];
        manager.channel.provide(serviceName, async (detail = {}) => {
            await manager.createOffscreenDocument();
            return Promise.resolve(manager.channel.request(eventName, detail));
        });
    });
}

const OCR_SERVICE_EVENT_MAP = {
    get_ocr_download_status: "get_ocr_language_status",
    download_ocr_languages: "download_ocr_languages",
    delete_ocr_languages: "delete_ocr_languages",
    cancel_ocr_language_downloads: "cancel_ocr_language_downloads",
};

function listenToTranslatorEvents(manager) {
    manager.channel.on("translate_page_google", () => {
        executeGoogleScript(manager.channel);
    });

    manager.channel.on("language_setting_update", manager.onLanguageSettingUpdated.bind(manager));
    manager.channel.on("frame_closed", manager.stopPronounce.bind(manager));
    chrome.storage.onChanged.addListener(onStorageChanged.bind(null, manager));
}

async function onStorageChanged(manager, changes, area) {
    if (area !== "sync") {
        return;
    }

    await manager.config_loader;
    await manager.createOffscreenDocument();

    if (changes["HybridTranslatorConfig"]) {
        manager.channel.emit(
            "hybrid_translator_use_config",
            changes["HybridTranslatorConfig"].newValue
        );
    }

    if (changes["OtherSettings"]) {
        manager.IN_MUTUAL_MODE = changes["OtherSettings"].newValue.MutualTranslate;
    }

    if (changes["languageSetting"]) {
        manager.LANGUAGE_SETTING = changes["languageSetting"].newValue;
    }

    if (changes["DefaultTranslator"]) {
        manager.DEFAULT_TRANSLATOR = changes["DefaultTranslator"].newValue;
    }
}

function resolveMutualLanguageSettings(languageSetting, detectedLanguage) {
    if (detectedLanguage === languageSetting.sl) {
        return {
            sourceLanguage: detectedLanguage,
            targetLanguage: languageSetting.tl,
        };
    }

    if (detectedLanguage === languageSetting.tl) {
        return {
            sourceLanguage: detectedLanguage,
            targetLanguage: languageSetting.sl,
        };
    }

    return {
        sourceLanguage: "auto",
        targetLanguage: languageSetting.tl,
    };
}

export { listenToTranslatorEvents, provideTranslatorServices, resolveMutualLanguageSettings };
