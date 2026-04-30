import { DEFAULT_SETTINGS, getOrSetDefaultSettings } from "common/scripts/settings.js";

export function registerOcrChannelServices({ channel, ocrClient }) {
    channel.provide("get_ocr_settings", async () => {
        const configs = await getOrSetDefaultSettings(["OCRSettings"], DEFAULT_SETTINGS);
        return configs.OCRSettings;
    });

    channel.provide("get_ocr_download_status", (detail = {}) =>
        ocrClient.getLanguageStatus(detail.languages)
    );

    channel.provide("download_ocr_languages", (detail = {}) =>
        ocrClient.downloadLanguages(detail.languages)
    );

    channel.provide("delete_ocr_languages", (detail = {}) =>
        ocrClient.deleteLanguages(detail.languages)
    );

    channel.provide("cancel_ocr_language_downloads", (detail = {}) =>
        ocrClient.cancelLanguageDownloads(detail.languages)
    );
}
