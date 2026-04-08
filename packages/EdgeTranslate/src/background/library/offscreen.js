const OFFSCREEN_PATH = "offscreen/offscreen.html";
const OFFSCREEN_REASONS = [
    chrome.offscreen.Reason.AUDIO_PLAYBACK,
    chrome.offscreen.Reason.DOM_PARSER,
];
const OFFSCREEN_JUSTIFICATION =
    "Provide DOM-capable background support for translator runtime and development reloads.";

let offscreenDocumentPromise = null;

async function hasOffscreenDocument() {
    const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ["OFFSCREEN_DOCUMENT"],
        documentUrls: [chrome.runtime.getURL(OFFSCREEN_PATH)],
    });
    return existingContexts.length > 0;
}

export async function ensureOffscreenDocument() {
    if (await hasOffscreenDocument()) {
        return;
    }

    if (!offscreenDocumentPromise) {
        offscreenDocumentPromise = (async () => {
            if (await hasOffscreenDocument()) {
                return;
            }

            try {
                await chrome.offscreen.createDocument({
                    url: OFFSCREEN_PATH,
                    reasons: OFFSCREEN_REASONS,
                    justification: OFFSCREEN_JUSTIFICATION,
                });
            } catch (error) {
                if (
                    !String(error?.message || error).includes(
                        "Only a single offscreen document may be created"
                    )
                ) {
                    throw error;
                }
            }
        })().finally(() => {
            offscreenDocumentPromise = null;
        });
    }

    await offscreenDocumentPromise;
}
