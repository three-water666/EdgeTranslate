import { DEFAULT_SETTINGS, getOrSetDefaultSettings } from "common/scripts/settings.js";

export function createTranslationState() {
    const state = {
        configReady: null,
        defaultTranslator: null,
        languageSetting: null,
        inMutualMode: false,
        ttsSpeed: "fast",

        async ready() {
            await this.configReady;
        },

        getPronunciationSpeed(speed) {
            if (speed) {
                return speed;
            }

            const nextSpeed = this.ttsSpeed;
            this.ttsSpeed = nextSpeed === "fast" ? "slow" : "fast";
            return nextSpeed;
        },

        updateDefaultTranslator(translator) {
            this.defaultTranslator = translator;
            return new Promise((resolve) => {
                chrome.storage.sync.set({ DefaultTranslator: translator }, resolve);
            });
        },

        applyStorageChanges(changes) {
            if (changes["OtherSettings"]) {
                this.inMutualMode = changes["OtherSettings"].newValue.MutualTranslate;
            }

            if (changes["languageSetting"]) {
                this.languageSetting = changes["languageSetting"].newValue;
            }

            if (changes["DefaultTranslator"]) {
                this.defaultTranslator = changes["DefaultTranslator"].newValue;
            }
        },
    };

    state.configReady = getOrSetDefaultSettings(
        ["DefaultTranslator", "languageSetting", "OtherSettings"],
        DEFAULT_SETTINGS
    ).then((configs) => {
        state.inMutualMode = configs.OtherSettings.MutualTranslate || false;
        state.languageSetting = configs.languageSetting;
        state.defaultTranslator = configs.DefaultTranslator;
    });

    return state;
}
