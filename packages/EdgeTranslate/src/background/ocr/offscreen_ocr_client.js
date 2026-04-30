import { ensureOffscreenDocument } from "../offscreen/document.js";

export function createOffscreenOcrClient(channel) {
    async function request(service, detail = {}) {
        await ensureOffscreenDocument();
        return channel.request(service, detail);
    }

    return {
        recognizeImage(detail) {
            return request("ocr_image", detail);
        },

        getLanguageStatus(languages) {
            return request("get_ocr_language_status", { languages });
        },

        downloadLanguages(languages) {
            return request("download_ocr_languages", { languages });
        },

        deleteLanguages(languages) {
            return request("delete_ocr_languages", { languages });
        },

        cancelLanguageDownloads(languages) {
            return request("cancel_ocr_language_downloads", { languages });
        },
    };
}
