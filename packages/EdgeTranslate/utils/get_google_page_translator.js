const fs = require("fs");
const path = require("path");
const axios = require("axios");

const GOOGLE_TRANSLATE_VENDOR_ROOT = path.join("vendor", "google-translate-element");
const GOOGLE_TRANSLATE_CURRENT_VERSION_FILE = path.join(
    GOOGLE_TRANSLATE_VENDOR_ROOT,
    "current-version.txt"
);
const ELEMENT_MAIN_JS = "element_main.js";
const ELEMENT_MAIN_CSS = "element_main.css";

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

async function fetch_text(url, requestConfig, assetName) {
    const response = await axios.get(url, requestConfig);
    if (response.status !== 200) {
        throw new Error(`Failed to get ${assetName}, status code: ${response.status}`);
    }

    return response.data;
}

function get_element_js_url(language) {
    return `https://translate.google.com/translate_a/element.js?cb=${TECB}&client=tee&hl=${language}&nsc=1`;
}

async function fetch_element_js(language, requestConfig) {
    return fetch_text(get_element_js_url(language), requestConfig, `elm_${language}.js`);
}

async function get_element_js(language, elementJsDir, requestConfig, content) {
    const script = content || (await fetch_element_js(language, requestConfig));
    fs.writeFileSync(path.join(elementJsDir, `elm_${language}.js`), script);
}

async function get_language_names(language, languageNamesDir, requestConfig) {
    const content = await fetch_text(
        `https://translate-pa.googleapis.com/v1/supportedLanguages?client=tee&display_language=${language}&key=${API_KEY}&callback=callback`,
        requestConfig,
        `lan_${language}.js`
    );

    fs.writeFileSync(path.join(languageNamesDir, `lan_${language}.js`), content);
}

function get_element_snapshot(content) {
    const match = content.match(/_exportVersion\(['"]([^'"]+)['"]\)/);
    if (!match) {
        throw new Error("Unable to detect Google Translate Element version.");
    }

    return match[1];
}

function decode_js_string_literal(content) {
    const escapedCharacters = {
        "\\": "\\",
        "'": "'",
        [String.fromCharCode(34)]: String.fromCharCode(34),
        "/": "/",
        b: "\b",
        f: "\f",
        n: "\n",
        r: "\r",
        t: "\t",
    };

    return content
        .replace(/\\x([0-9a-fA-F]{2})/g, (_match, codePoint) =>
            String.fromCharCode(parseInt(codePoint, 16))
        )
        .replace(/\\u([0-9a-fA-F]{4})/g, (_match, codePoint) =>
            String.fromCharCode(parseInt(codePoint, 16))
        )
        .replace(/\\([\\'"/bfnrt])/g, (_match, character) => escapedCharacters[character]);
}

function get_string_assignment(content, target) {
    const match = content.match(
        new RegExp(`${target}\\s*=\\s*(['"])((?:\\\\.|(?!\\1).)*)\\1\\s*;`)
    );
    if (!match) {
        throw new Error(`Unable to detect ${target} URL.`);
    }

    return decode_js_string_literal(match[2]);
}

function get_main_script_url(content) {
    const match = content.match(
        /_loadCss\(c\._ps\);\s*_loadJs\(\s*(['"])((?:\\.|(?!\1).)*)\1\s*\)/
    );
    if (!match) {
        throw new Error("Unable to detect Google Translate Element main script URL.");
    }

    return decode_js_string_literal(match[2]);
}

function get_runtime_asset_urls(content) {
    return {
        cssUrl: get_string_assignment(content, "c\\._ps"),
        jsUrl: get_main_script_url(content),
    };
}

async function download_runtime_asset(url, targetPath, requestConfig) {
    const content = await fetch_text(url, requestConfig, path.basename(targetPath));
    fs.writeFileSync(targetPath, content);
}

async function download_runtime_assets(runtimeAssets, googleTranslateVendorDir, requestConfig) {
    await Promise.all([
        download_runtime_asset(
            runtimeAssets.cssUrl,
            path.join(googleTranslateVendorDir, ELEMENT_MAIN_CSS),
            requestConfig
        ),
        download_runtime_asset(
            runtimeAssets.jsUrl,
            path.join(googleTranslateVendorDir, ELEMENT_MAIN_JS),
            requestConfig
        ),
    ]);
}

function assert_snapshot_complete(googleTranslateVendorDir) {
    const requiredPaths = [
        ELEMENT_MAIN_CSS,
        ELEMENT_MAIN_JS,
        path.join("elms", `elm_${VERSION_PROBE_LANGUAGE}.js`),
        path.join("lans", `lan_${VERSION_PROBE_LANGUAGE}.js`),
    ];

    for (const item of requiredPaths) {
        const fullPath = path.join(googleTranslateVendorDir, item);
        if (!fs.existsSync(fullPath)) {
            throw new Error(`Google Translate Element snapshot is incomplete: ${fullPath}`);
        }
    }
}

function create_request_config() {
    if (!process.env["ALL_PROXY"]) {
        return {};
    }

    const { SocksProxyAgent } = require("socks-proxy-agent");
    const httpsAgent = new SocksProxyAgent(process.env["ALL_PROXY"]);
    return { httpsAgent, proxy: false };
}

/**
 * Enable proxy if the ALL_PROXY env is set.
 */
async function main() {
    const requestConfig = create_request_config();
    const versionProbeScript = await fetch_element_js(VERSION_PROBE_LANGUAGE, requestConfig);
    const snapshot = get_element_snapshot(versionProbeScript);
    const runtimeAssets = get_runtime_asset_urls(versionProbeScript);
    const googleTranslateVendorDir = path.join(GOOGLE_TRANSLATE_VENDOR_ROOT, snapshot);
    const elementJsDir = path.join(googleTranslateVendorDir, "elms");
    const languageNamesDir = path.join(googleTranslateVendorDir, "lans");

    fs.mkdirSync(elementJsDir, { recursive: true });
    fs.mkdirSync(languageNamesDir, { recursive: true });

    await Promise.all([
        download_runtime_assets(runtimeAssets, googleTranslateVendorDir, requestConfig),
        get_element_js(VERSION_PROBE_LANGUAGE, elementJsDir, requestConfig, versionProbeScript),
        ...LANGUAGES.filter((language) => language !== VERSION_PROBE_LANGUAGE).map((language) =>
            get_element_js(language, elementJsDir, requestConfig)
        ),
        ...LANGUAGES.map((language) =>
            get_language_names(language, languageNamesDir, requestConfig)
        ),
    ]);

    assert_snapshot_complete(googleTranslateVendorDir);
    fs.writeFileSync(GOOGLE_TRANSLATE_CURRENT_VERSION_FILE, `${snapshot}\n`);
    console.log(`Google Translate Element snapshot ${snapshot} is ready.`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
