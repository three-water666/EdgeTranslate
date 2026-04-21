import { promiseTabs, delayPromise } from "common/scripts/promise.js";
import { DEFAULT_SETTINGS, getOrSetDefaultSettings } from "common/scripts/settings.js";
import LocalTTS from "./local_tts.js";
import { ensureOffscreenDocument } from "./offscreen.js";
import { translatePage, executeGoogleScript } from "./page_translate.js";
import { runScreenshotTranslate } from "./screenshot_translate.js";
import {
    listenToTranslatorEvents,
    provideTranslatorServices,
    resolveMutualLanguageSettings,
} from "./translate_runtime.js";

class TranslatorManager {
    /**
     * @param {import("../../common/scripts/channel.js").default} channel Communication channel.
     */
    constructor(channel) {
        /**
         * @type {import("../../common/scripts/channel.js").default} Communication channel.
         */
        this.channel = channel;

        /**
         * @type {Promise<Void>} Initialize configurations.
         */
        this.config_loader = getOrSetDefaultSettings(
            ["DefaultTranslator", "languageSetting", "OtherSettings"],
            DEFAULT_SETTINGS
        ).then((configs) => {
            // Mutual translating mode flag.
            this.IN_MUTUAL_MODE = configs.OtherSettings.MutualTranslate || false;

            // Translation language settings.
            this.LANGUAGE_SETTING = configs.languageSetting;

            // The default translator to use.
            this.DEFAULT_TRANSLATOR = configs.DefaultTranslator;
        });

        /**
         * Default TTS speed.
         */
        this.TTS_SPEED = "fast";

        /**
         * Local TTS service.
         */
        this.localTTS = new LocalTTS();

        /**
         * Start to provide services and listen to event.
         */
        this.provideServices();
        this.listenToEvents();
    }

    async createOffscreenDocument() {
        await ensureOffscreenDocument();
    }
    /**
     * Register service providers.
     *
     * This should be called for only once!
     */
    provideServices() {
        provideTranslatorServices(this);
    }

    /**
     * Register event listeners.
     *
     * This should be called for only once!
     */
    listenToEvents() {
        listenToTranslatorEvents(this);
    }

    /**
     * get the id of the current tab
     * if the current tab can't display the result panel
     * open a notice page to display the result and explain why the page shows
     * @returns the tab id. If tabId===-1, the user is setting the file URLs access permission and nothing should be done.
     */
    async getCurrentTabId() {
        let tabId = -1;
        const tabs = await promiseTabs.query({ active: true, currentWindow: true });
        tabId = tabs[0].id;

        // to test whether the current tab can receive message(display results)
        await this.channel.requestToTab(tabId, "check_availability").catch(async () => {
            const shouldOpenNoticePage = await new Promise((resolve) => {
                // The page is a local file page
                if (/^file:\/\.*/.test(tabs[0].url)) {
                    chrome.extension.isAllowedFileSchemeAccess((allowed) => {
                        if (!allowed && confirm(chrome.i18n.getMessage("PermissionRemind"))) {
                            chrome.tabs.create({
                                url: `chrome://extensions/?id=${chrome.runtime.id}`,
                            });
                            resolve(false);
                        } else resolve(true);
                    });
                } else resolve(true);
            });
            if (!shouldOpenNoticePage) {
                tabId = -1;
                return;
            }
            /**
             * the current tab can't display the result panel
             * so we open a notice page to display the result and explain why this page shows
             */
            const noticePageUrl = chrome.runtime.getURL("content/notice/notice.html");
            // get the tab id of an existing notice page
            try {
                const tab = (await promiseTabs.query({ url: noticePageUrl }))[0];
                // jump to the existed page
                chrome.tabs.highlight({
                    tabs: tab.index,
                });
                tabId = tab.id;
            } catch (error) {
                // create a new notice page
                const tab = await promiseTabs.create({
                    url: noticePageUrl,
                    active: true,
                });
                // wait for browser to open a new page
                await delayPromise(200);
                tabId = tab.id;
            }
        });
        return tabId;
    }

    /**
     *
     * 检测给定文本的语言。
     *
     * @param {string} text 需要检测的文本
     *
     * @returns {Promise<String>} detected language Promise
     */
    async detect(text) {
        // Ensure that configurations have been initialized.
        await this.config_loader;
        await this.createOffscreenDocument();

        const DEFAULT_TRANSLATOR = this.DEFAULT_TRANSLATOR;

        return await this.channel.request("translator_detect_by_default_translator", {
            DEFAULT_TRANSLATOR,
            text,
        });
    }

    /**
     *
     * This is a translation client function
     * 1. get language settings
     * 2. if source language is "auto", use normal translation mode
     * 3. else use mutual translation mode(auto translate from both sides)
     * 4. send request, get result
     *
     * @param {String} text original text to be translated
     * @param {Array<Number>} position position of the text
     *
     * @returns {Promise<void>} translate finished Promise
     */
    async translate(text, position, options = {}) {
        // Ensure that configurations have been initialized.
        await this.config_loader;
        await this.createOffscreenDocument();

        // get current tab id
        const currentTabId = await this.getCurrentTabId();
        if (currentTabId === -1) return;

        return this.translateOnTabWithOptions(currentTabId, text, position, options);
    }

    async translateOnTab(tabId, text, position) {
        return this.translateOnTabWithOptions(tabId, text, position, {});
    }

    async translateOnTabWithOptions(tabId, text, position, options = {}) {
        // Ensure that configurations have been initialized.
        await this.config_loader;
        await this.createOffscreenDocument();
        const timestamp = options.timestamp || new Date().getTime();
        this.emitTranslateStart({ tabId, text, position, timestamp, options });

        try {
            const languagePair = await this.resolveLanguagePair(text);
            const result = await this.requestTranslation(text, languagePair, options);
            this.channel.emitToTabs(tabId, "translating_finished", {
                timestamp,
                translateMode: options.translateMode,
                ...result,
            });
        } catch (error) {
            this.channel.emitToTabs(tabId, "translating_error", {
                error,
                timestamp,
                translateMode: options.translateMode,
            });
        }
    }

    async screenshotTranslate() {
        return runScreenshotTranslate(this);
    }

    emitTranslateStart({ tabId, text, position, timestamp, options }) {
        if (options.skipStartEvent) {
            return;
        }

        this.channel.emitToTabs(tabId, "start_translating", {
            text,
            position,
            timestamp,
            loadingMessage: options.loadingMessage,
            translateMode: options.translateMode,
        });
    }

    async resolveLanguagePair(text) {
        let sourceLanguage = this.LANGUAGE_SETTING.sl;
        let targetLanguage = this.LANGUAGE_SETTING.tl;

        if (sourceLanguage !== "auto" && this.IN_MUTUAL_MODE) {
            const detectedLanguage = await this.detect(text);
            return resolveMutualLanguageSettings(this.LANGUAGE_SETTING, detectedLanguage);
        }

        return { sourceLanguage, targetLanguage };
    }

    async requestTranslation(text, languagePair, options = {}) {
        const DEFAULT_TRANSLATOR = options.defaultTranslator || this.DEFAULT_TRANSLATOR;
        const result = await this.channel.request("translator_by_default_translator", {
            DEFAULT_TRANSLATOR,
            text,
            sl: languagePair.sourceLanguage,
            tl: languagePair.targetLanguage,
        });

        result.sourceLanguage = languagePair.sourceLanguage;
        result.targetLanguage = languagePair.targetLanguage;
        return result;
    }

    /**
     * Text to speech proxy.
     *
     * @param {String} pronouncing which text are we pronouncing? enum{source, target}
     * @param {String} text The text.
     * @param {String} language The language of the text.
     * @param {String} speed The speed of the speech.
     *
     * @returns {Promise<void>} pronounce finished Promise
     */
    async pronounce(pronouncing, text, language, speed) {
        // Ensure that configurations have been initialized.
        await this.config_loader;
        await this.createOffscreenDocument();

        // get current tab id
        const currentTabId = await this.getCurrentTabId();
        if (currentTabId === -1) return;

        let lang = language;
        let timestamp = new Date().getTime();

        // Inform current tab pronouncing started.
        this.channel.emitToTabs(currentTabId, "start_pronouncing", {
            pronouncing,
            text,
            language,
            timestamp,
        });

        try {
            const DEFAULT_TRANSLATOR = this.DEFAULT_TRANSLATOR;
            if (language === "auto") {
                lang = await this.channel.request("translator_detect_by_default_translator", {
                    DEFAULT_TRANSLATOR,
                    text,
                });
            }

            await this.channel
                .request("translator_pronounce_by_default_translator", {
                    DEFAULT_TRANSLATOR,
                    text,
                    lang,
                    speed,
                })
                .catch(
                    ((error) => {
                        // API pronouncing failed, try local TTS service.
                        if (!this.localTTS.speak(text, lang, speed)) {
                            throw error;
                        }
                    }).bind(this)
                );

            // Inform current tab pronouncing finished.
            this.channel.emitToTabs(currentTabId, "pronouncing_finished", {
                pronouncing,
                text,
                language,
                timestamp,
            });
        } catch (error) {
            // Inform current tab pronouncing failed.
            this.channel.emitToTabs(currentTabId, "pronouncing_error", {
                pronouncing,
                error,
                timestamp,
            });
        }
    }

    /**
     * Stop pronounce proxy.
     */
    async stopPronounce() {
        // Ensure that configurations have been initialized.
        await this.config_loader;
        await this.createOffscreenDocument();

        const DEFAULT_TRANSLATOR = this.DEFAULT_TRANSLATOR;
        this.channel.request("translator_stop_pronounce_by_default_translator", {
            DEFAULT_TRANSLATOR,
        });
        this.localTTS.pause();
    }

    /**
     * Get translators that support given source language and target language.
     *
     * @param {Object} detail current language setting, detail.from is source language, detail.to is target language
     *
     * @returns {Array<String>} available translators Promise.
     */
    async getAvailableTranslators(detail) {
        await this.createOffscreenDocument();
        const availableTranslators = await this.channel.request(
            "hybrid_translator_get_available_translators",
            detail
        );
        return ["HybridTranslate"].concat(availableTranslators);
    }

    /**
     * Language setting update event listener.
     *
     * @param {Object} detail updated language setting, detail.from is source language, detail.to is target language
     *
     * @returns {Promise<void>} finished Promise
     */
    async onLanguageSettingUpdated(detail) {
        let selectedTranslator = this.DEFAULT_TRANSLATOR;

        // Get translators supporting new language setting.
        let availableTranslators = await this.getAvailableTranslators(detail);

        // Update hybrid translator config.
        const newConfig = await this.channel.request("hybrid_translator_update_config", detail);
        // Update config.
        chrome.storage.sync.set({ HybridTranslatorConfig: newConfig });

        // If current default translator does not support new language setting, update it.
        if (!new Set(availableTranslators).has(selectedTranslator)) {
            selectedTranslator = availableTranslators[1];
            chrome.storage.sync.set({ DefaultTranslator: selectedTranslator });
        }

        // Inform options page to update options.
        this.channel.emit("hybrid_translator_config_updated", {
            config: newConfig,
            availableTranslators: availableTranslators.slice(1),
        });

        // Inform result frame to update options.
        promiseTabs.query({ active: true, currentWindow: true }).then((tabs) =>
            this.channel.emitToTabs(tabs[0].id, "update_translator_options", {
                selectedTranslator,
                availableTranslators,
            })
        );
    }

    /**
     * Update translator.
     *
     * @param {string} translator the new translator to use.
     *
     * @returns {Promise<void>} update finished promise.
     */
    updateDefaultTranslator(translator) {
        return new Promise((resolve) => {
            this.DEFAULT_TRANSLATOR = translator;
            chrome.storage.sync.set({ DefaultTranslator: translator }, () => {
                resolve();
            });
        });
    }
}

export { TranslatorManager, translatePage, executeGoogleScript };
