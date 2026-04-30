import LocalTTS from "./local_tts.js";

export function createPronunciationService({
    state,
    translatorClient,
    tabPresenter,
    getCurrentTabId,
    localTts = new LocalTTS(),
}) {
    async function pronounce(request) {
        const { pronouncing, text, language } = request;
        const speed = state.getPronunciationSpeed(request.speed);

        await state.ready();

        const currentTabId = await getCurrentTabId();
        if (currentTabId === -1) return;

        let lang = language;
        const timestamp = new Date().getTime();

        tabPresenter.startPronouncing(currentTabId, {
            pronouncing,
            text,
            language,
            timestamp,
        });

        try {
            const defaultTranslator = state.defaultTranslator;
            if (language === "auto") {
                lang = await translatorClient.detect(defaultTranslator, text);
            }

            await translatorClient
                .pronounce(defaultTranslator, text, lang, speed)
                .catch(async (error) => {
                    if (!(await localTts.speak(text, lang, speed))) {
                        throw error;
                    }
                });

            tabPresenter.pronouncingFinished(currentTabId, {
                pronouncing,
                text,
                language,
                timestamp,
            });
        } catch (error) {
            tabPresenter.pronouncingError(currentTabId, {
                pronouncing,
                error,
                timestamp,
            });
        }
    }

    async function stop() {
        await state.ready();
        try {
            await translatorClient.stopPronounce(state.defaultTranslator);
        } finally {
            localTts.pause();
        }
    }

    return {
        pronounce,
        stop,
    };
}
