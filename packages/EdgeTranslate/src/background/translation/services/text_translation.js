export function createTextTranslationService(dependencies) {
    return {
        detect: (text) => detectTextLanguage(dependencies, text),
        translate: (text, position, options = {}) =>
            translateText(dependencies, text, position, options),
        translateOnTab: (tabId, text, position) =>
            translateTextOnTab(dependencies, tabId, text, position),
        translateOnTabWithOptions: (request) =>
            translateTextOnTabWithOptions(dependencies, request),
        resolveLanguagePair: (text) => resolveLanguagePair(dependencies, text),
        requestTranslation: (text, languagePair, options = {}) =>
            requestTranslation(dependencies, text, languagePair, options),
    };
}

async function detectTextLanguage({ state, translatorClient }, text) {
    await state.ready();
    return translatorClient.detect(state.defaultTranslator, text);
}

async function translateText(dependencies, text, position, options = {}) {
    const { state, getCurrentTabId } = dependencies;
    await state.ready();

    const currentTabId = await getCurrentTabId();
    if (currentTabId === -1) return;

    return translateTextOnTabWithOptions(dependencies, {
        tabId: currentTabId,
        text,
        position,
        options,
    });
}

function translateTextOnTab(dependencies, tabId, text, position) {
    return translateTextOnTabWithOptions(dependencies, {
        tabId,
        text,
        position,
    });
}

async function translateTextOnTabWithOptions(dependencies, request) {
    const { state, tabPresenter } = dependencies;
    const { tabId, text, position, options = {} } = request;

    await state.ready();
    const timestamp = options.timestamp || new Date().getTime();
    emitTranslateStart(tabPresenter, { tabId, text, position, timestamp, options });

    try {
        const languagePair = await resolveLanguagePair(dependencies, text);
        const result = await requestTranslation(dependencies, text, languagePair, options);
        tabPresenter.translatingFinished(tabId, {
            timestamp,
            translateMode: options.translateMode,
            ...result,
        });
    } catch (error) {
        tabPresenter.translatingError(tabId, {
            error,
            timestamp,
            translateMode: options.translateMode,
        });
    }
}

function emitTranslateStart(tabPresenter, { tabId, text, position, timestamp, options }) {
    if (options.skipStartEvent) {
        return;
    }

    tabPresenter.startTranslating(tabId, {
        text,
        position,
        timestamp,
        loadingMessage: options.loadingMessage,
        translateMode: options.translateMode,
    });
}

async function resolveLanguagePair(dependencies, text) {
    const { state } = dependencies;
    let sourceLanguage = state.languageSetting.sl;
    let targetLanguage = state.languageSetting.tl;

    if (sourceLanguage !== "auto" && state.inMutualMode) {
        const detectedLanguage = await detectTextLanguage(dependencies, text);
        return resolveMutualLanguageSettings(state.languageSetting, detectedLanguage);
    }

    return { sourceLanguage, targetLanguage };
}

async function requestTranslation({ state, translatorClient }, text, languagePair, options = {}) {
    const defaultTranslator = options.defaultTranslator || state.defaultTranslator;
    const result = await translatorClient.translate(
        defaultTranslator,
        text,
        languagePair.sourceLanguage,
        languagePair.targetLanguage
    );

    result.sourceLanguage = languagePair.sourceLanguage;
    result.targetLanguage = languagePair.targetLanguage;
    return result;
}

export function resolveMutualLanguageSettings(languageSetting, detectedLanguage) {
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
