const fs = require("fs");
const path = require("path");
const axios = require("axios");
const socks = require("socks-proxy-agent").SocksProxyAgent;

const GOOGLE_TRANSLATE_VENDOR_ROOT = path.join("vendor", "google-translate-element");
const GOOGLE_TRANSLATE_CURRENT_VERSION_FILE = path.join(
    GOOGLE_TRANSLATE_VENDOR_ROOT,
    "current-version.txt"
);

const LANGUAGES = [
    "af",
    "am",
    "ar",
    "az",
    "be",
    "bg",
    "bn",
    "bs",
    "ca",
    "ceb",
    "co",
    "cs",
    "cy",
    "da",
    "de",
    "el",
    "en",
    "eo",
    "es",
    "et",
    "eu",
    "fa",
    "fi",
    "fil",
    "fr",
    "fy",
    "ga",
    "gd",
    "gl",
    "gu",
    "ha",
    "haw",
    "he",
    "hi",
    "hmn",
    "hr",
    "ht",
    "hu",
    "hy",
    "id",
    "ig",
    "is",
    "it",
    "ja",
    "jw",
    "ka",
    "kk",
    "km",
    "kn",
    "ko",
    "ku",
    "ky",
    "la",
    "lb",
    "lo",
    "lt",
    "lv",
    "mg",
    "mi",
    "mk",
    "ml",
    "mn",
    "mr",
    "ms",
    "mt",
    "my",
    "ne",
    "nl",
    "no",
    "ny",
    "pl",
    "ps",
    "pt",
    "ro",
    "ru",
    "sd",
    "si",
    "sk",
    "sl",
    "sm",
    "sn",
    "so",
    "sq",
    "sr",
    "st",
    "su",
    "sv",
    "sw",
    "ta",
    "te",
    "tg",
    "th",
    "tr",
    "uk",
    "ur",
    "uz",
    "vi",
    "xh",
    "yi",
    "yo",
    "zh-CN",
    "zh-TW",
    "zu",
];

const TECB = "TECB_1E07F158C6FA4460B352973E9693B329";
const API_KEY = "AIzaSyBWDj0QJvVIx8XOhRegXX5_SrRWxhT5Hs4";
const VERSION_PROBE_LANGUAGE = "en";

async function fetch_element_js(language, httpsAgent) {
    let config = httpsAgent !== null ? { httpsAgent } : {};
    const response = await axios.get(
        `https://translate.google.com/translate_a/element.js?cb=${TECB}&client=tee&hl=${language}&nsc=1`,
        config
    );

    if (response.status !== 200) {
        console.log(`Failed to get elm_${language}.js, status code: ${response.status}`);
        return;
    }

    return response.data;
}

async function get_element_js(language, elementJsDir, httpsAgent, content) {
    const script = content || (await fetch_element_js(language, httpsAgent));
    if (!script) {
        return;
    }

    fs.writeFileSync(path.join(elementJsDir, `elm_${language}.js`), script);
}

async function get_language_names(language, languageNamesDir, httpsAgent) {
    let config = httpsAgent !== null ? { httpsAgent } : {};
    const response = await axios.get(
        `https://translate-pa.googleapis.com/v1/supportedLanguages?client=tee&display_language=${language}&key=${API_KEY}&callback=callback`,
        config
    );

    if (response.status !== 200) {
        console.log(`Failed to get lan_${language}.js, status code: ${response.status}`);
        return;
    }

    fs.writeFileSync(path.join(languageNamesDir, `lan_${language}.js`), response.data);
}

function get_element_snapshot(content) {
    const match = content.match(/_exportVersion\(['"]([^'"]+)['"]\)/);
    if (!match) {
        throw new Error("Unable to detect Google Translate Element version.");
    }

    return match[1];
}

/**
 * Enable proxy if the ALL_PROXY env is set.
 */
async function main() {
    let httpsAgent = null;
    if (process.env["ALL_PROXY"]) {
        httpsAgent = new socks(process.env["ALL_PROXY"]);
    }

    const versionProbeScript = await fetch_element_js(VERSION_PROBE_LANGUAGE, httpsAgent);
    const snapshot = get_element_snapshot(versionProbeScript);
    const googleTranslateVendorDir = path.join(GOOGLE_TRANSLATE_VENDOR_ROOT, snapshot);
    const elementJsDir = path.join(googleTranslateVendorDir, "elms");
    const languageNamesDir = path.join(googleTranslateVendorDir, "lans");

    fs.mkdirSync(elementJsDir, { recursive: true });
    fs.mkdirSync(languageNamesDir, { recursive: true });

    await Promise.all([
        get_element_js(VERSION_PROBE_LANGUAGE, elementJsDir, httpsAgent, versionProbeScript),
        ...LANGUAGES.filter((language) => language !== VERSION_PROBE_LANGUAGE).map((language) =>
            get_element_js(language, elementJsDir, httpsAgent)
        ),
        ...LANGUAGES.map((language) => get_language_names(language, languageNamesDir, httpsAgent)),
    ]);

    fs.writeFileSync(GOOGLE_TRANSLATE_CURRENT_VERSION_FILE, `${snapshot}\n`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
