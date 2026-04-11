import { log } from "common/scripts/common.js";
import { promiseTabs, delayPromise } from "common/scripts/promise.js";
import { DEFAULT_SETTINGS, getOrSetDefaultSettings } from "common/scripts/settings.js";
import LocalTTS from "./local_tts.js";
import { ensureOffscreenDocument } from "./offscreen.js";

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
        // Translate service.
        this.channel.provide("translate", (params) => this.translate(params.text, params.position));

        // Pronounce service.
        this.channel.provide("pronounce", (params) => {
            let speed = params.speed;
            if (!speed) {
                speed = this.TTS_SPEED;
                this.TTS_SPEED = speed === "fast" ? "slow" : "fast";
            }

            return this.pronounce(params.pronouncing, params.text, params.language, speed);
        });

        // Get available translators service.
        this.channel.provide("get_available_translators", (params) =>
            this.getAvailableTranslators(params)
        );

        // Update default translator service.
        this.channel.provide("update_default_translator", (detail) =>
            this.updateDefaultTranslator(detail.translator)
        );

        this.channel.provide("get_translator_config", async () => {
            console.log("Service Worker: Received config request from Offscreen.");

            const configs = await getOrSetDefaultSettings(
                ["HybridTranslatorConfig"],
                DEFAULT_SETTINGS
            );

            return Promise.resolve(configs);
        });

        this.channel.provide("get_ocr_settings", async () => {
            const configs = await getOrSetDefaultSettings(["OCRSettings"], DEFAULT_SETTINGS);
            return Promise.resolve(configs.OCRSettings);
        });

        this.channel.provide("screenshot_translate", () => this.screenshotTranslate());
    }

    /**
     * Register event listeners.
     *
     * This should be called for only once!
     */
    listenToEvents() {
        // Google page translate button clicked event.
        this.channel.on("translate_page_google", () => {
            executeGoogleScript(this.channel);
        });

        // Language setting updated event.
        this.channel.on("language_setting_update", this.onLanguageSettingUpdated.bind(this));

        // Result frame closed event.
        this.channel.on("frame_closed", this.stopPronounce.bind(this));

        /**
         * Update config cache on config changed.
         */
        chrome.storage.onChanged.addListener(
            (async (changes, area) => {
                if (area === "sync") {
                    // Ensure that configurations have been initialized.
                    await this.config_loader;
                    await this.createOffscreenDocument();

                    if (changes["HybridTranslatorConfig"]) {
                        this.channel.emit(
                            "hybrid_translator_use_config",
                            changes["HybridTranslatorConfig"].newValue
                        );
                    }

                    if (changes["OtherSettings"]) {
                        this.IN_MUTUAL_MODE = changes["OtherSettings"].newValue.MutualTranslate;
                    }

                    if (changes["languageSetting"]) {
                        this.LANGUAGE_SETTING = changes["languageSetting"].newValue;
                    }

                    if (changes["DefaultTranslator"]) {
                        this.DEFAULT_TRANSLATOR = changes["DefaultTranslator"].newValue;
                    }
                }
            }).bind(this)
        );
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
    async translate(text, position) {
        // Ensure that configurations have been initialized.
        await this.config_loader;
        await this.createOffscreenDocument();

        // get current tab id
        const currentTabId = await this.getCurrentTabId();
        if (currentTabId === -1) return;

        return this.translateOnTab(currentTabId, text, position);
    }

    async translateOnTab(tabId, text, position) {
        // Ensure that configurations have been initialized.
        await this.config_loader;
        await this.createOffscreenDocument();

        /**
         * Get current time as timestamp.
         *
         * Timestamp is used for preventing disordered translating message to disturb user.
         *
         * Every translating request has a unique timestamp and every message from that translating
         * request will be assigned with the timestamp. About usage of the timestamp, please refer
         * to display.js.
         */
        let timestamp = new Date().getTime();

        // Inform current tab translating started.
        this.channel.emitToTabs(tabId, "start_translating", {
            text,
            position,
            timestamp,
        });

        let sl = this.LANGUAGE_SETTING.sl,
            tl = this.LANGUAGE_SETTING.tl;

        try {
            if (sl !== "auto" && this.IN_MUTUAL_MODE) {
                // mutual translate mode, detect language first.
                sl = await this.detect(text);
                switch (sl) {
                    case this.LANGUAGE_SETTING.sl:
                        tl = this.LANGUAGE_SETTING.tl;
                        break;
                    case this.LANGUAGE_SETTING.tl:
                        tl = this.LANGUAGE_SETTING.sl;
                        break;
                    default:
                        sl = "auto";
                        tl = this.LANGUAGE_SETTING.tl;
                }
            }

            // Do translate.
            const DEFAULT_TRANSLATOR = this.DEFAULT_TRANSLATOR;
            let result = await this.channel.request("translator_by_default_translator", {
                DEFAULT_TRANSLATOR,
                text,
                sl,
                tl,
            });
            result.sourceLanguage = sl;
            result.targetLanguage = tl;

            // Send translating result to current tab.
            this.channel.emitToTabs(tabId, "translating_finished", {
                timestamp,
                ...result,
            });
        } catch (error) {
            // Inform current tab translating failed.
            this.channel.emitToTabs(tabId, "translating_error", {
                error,
                timestamp,
            });
        }
    }

    async screenshotTranslate() {
        await this.config_loader;
        await this.createOffscreenDocument();

        const tabs = await promiseTabs.query({ active: true, currentWindow: true });
        const currentTab = tabs[0];

        let selection;
        try {
            selection = await this.channel.requestToTab(currentTab.id, "select_capture_area");
        } catch (error) {
            notifyScreenshotTranslate(chrome.i18n.getMessage("ScreenshotTranslateUnsupported"));
            throw error;
        }

        if (!selection || !selection.rect) return;

        const screenshotUrl = await captureVisibleTab(currentTab.windowId);
        let text;
        try {
            text = await this.channel.request("ocr_image", {
                screenshotUrl,
                rect: selection.rect,
                viewportWidth: selection.viewportWidth,
                viewportHeight: selection.viewportHeight,
            });
        } catch (error) {
            notifyScreenshotTranslate(chrome.i18n.getMessage("ScreenshotTranslateFailed"));
            throw error;
        }

        const cleanedText = typeof text === "string" ? text.trim() : "";
        if (!cleanedText) {
            notifyScreenshotTranslate(chrome.i18n.getMessage("ScreenshotTranslateNoText"));
            return;
        }

        return this.translateOnTab(currentTab.id, cleanedText, selection.position);
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
            chrome.storage.sync.set({ DefaultTranslator: translator }, () => {
                resolve();
            });
        });
    }
}

/**
 * 使用用户选定的网页翻译引擎翻译当前网页。
 *
 * @param {import("../../common/scripts/channel.js").default} channel Communication channel.
 */
function translatePage(channel) {
    getOrSetDefaultSettings(["DefaultPageTranslator"], DEFAULT_SETTINGS).then((result) => {
        let translator = result.DefaultPageTranslator;
        switch (translator) {
            case "GooglePageTranslate":
                executeGoogleScript(channel);
                break;
            default:
                executeGoogleScript(channel);
                break;
        }
    });
}

/**
 * 执行谷歌网页翻译相关脚本。
 *
 * @param {import("../../common/scripts/channel.js").default} channel Communication channel.
 */
async function executeGoogleScript(channel) {
    let tabs;
    try {
        tabs = await promiseTabs.query({ active: true, currentWindow: true });
        if (!tabs || tabs.length === 0) {
            log("No active tab found to execute script.");
            return;
        }
        const tabId = tabs[0].id;
        await chrome.scripting.executeScript({
            target: { tabId },
            files: ["/google/init.js"],
        });
        channel.emitToTabs(tabId, "start_page_translate", { translator: "google" });
    } catch (e) {
        if (tabs && tabs.length > 0) {
            log(`Failed to execute script on tab ${tabs[0].id} (${tabs[0].url}): ${e.message}`);
        } else if (e instanceof Error) {
            log(`Chrome runtime error: ${e.message}`);
        } else {
            log(`Chrome runtime error: ${String(e)}`);
        }
    }
}

function captureVisibleTab(windowId) {
    return new Promise((resolve, reject) => {
        chrome.tabs.captureVisibleTab(windowId, { format: "png" }, (dataUrl) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
                return;
            }
            resolve(dataUrl);
        });
    });
}

function notifyScreenshotTranslate(message) {
    if (!message) return;

    chrome.notifications.create({
        type: "basic",
        iconUrl: chrome.runtime.getURL("icon/icon128.png"),
        title: chrome.i18n.getMessage("AppName"),
        message,
    });
}

export { TranslatorManager, translatePage, executeGoogleScript };
