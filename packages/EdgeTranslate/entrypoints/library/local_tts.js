/**
 * Local TTS service provider.
 */
class LocalTTS {
    constructor() {
        this.speaking = false;
    }

    /**
     * Speak given text.
     *
     * @param {String} text text to pronounce
     * @param {String} language language of text (e.g., "en-US", "zh-CN")
     * @param {String} speed "fast" or "slow"
     *
     * @returns {Promise<boolean>} is speaking successfully initiated?
     */
    async speak(text, language, speed) {
        if (this.speaking) {
            this.pause();
        }

        const voices = await new Promise((resolve) => chrome.tts.getVoices(resolve));
        const hasVoice = voices.find((voice) => voice.lang && voice.lang.startsWith(language));

        if (!hasVoice) {
            console.log(`No voice for language: "${language}" (using chrome.tts)`);
            return false;
        }

        this.speaking = true;
        const rate = speed === "fast" ? 1.0 : 0.6;

        chrome.tts.speak(
            text,
            {
                lang: language,
                rate,
                onEvent: (event) => {
                    if (
                        event.type === "end" ||
                        event.type === "interrupted" ||
                        event.type === "cancelled" ||
                        event.type === "error"
                    ) {
                        this.speaking = false;
                        if (event.type === "error") {
                            console.error("TTS Error:", event.errorMessage);
                        }
                    }
                },
            },
            () => {
                if (chrome.runtime.lastError) {
                    console.error(chrome.runtime.lastError.message);
                    this.speaking = false;
                }
            }
        );

        return true;
    }

    /**
     * Stop speaking.
     */
    pause() {
        if (this.speaking) {
            chrome.tts.stop();
            this.speaking = false;
        }
    }
}

export default LocalTTS;
