const fs = require("fs");
const path = require("path");

const EDGE_TRANSLATE_DIR = path.resolve(__dirname, "..");
const GOOGLE_TRANSLATE_VENDOR_ROOT = path.join(
    EDGE_TRANSLATE_DIR,
    "vendor",
    "google-translate-element"
);
const GOOGLE_TRANSLATE_CURRENT_VERSION_FILE = path.join(
    GOOGLE_TRANSLATE_VENDOR_ROOT,
    "current-version.txt"
);
const GOOGLE_OUTPUT_DIR = "google";

function syncGoogleTranslateAssets({ outputDir }) {
    const absoluteOutputDir = path.resolve(EDGE_TRANSLATE_DIR, outputDir);
    const googleOutputDir = path.join(absoluteOutputDir, GOOGLE_OUTPUT_DIR);
    const googleTranslateVendorDir = path.join(
        GOOGLE_TRANSLATE_VENDOR_ROOT,
        getGoogleTranslateElementSnapshot()
    );

    copyDirectory(googleTranslateVendorDir, googleOutputDir);
    patchElementBootstrapFiles(path.join(googleOutputDir, "elms"));
}

function getGoogleTranslateElementSnapshot() {
    return fs.readFileSync(GOOGLE_TRANSLATE_CURRENT_VERSION_FILE, "utf8").trim();
}

function copyFile(source, target) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
}

function copyDirectory(source, target) {
    if (!fs.existsSync(source)) {
        return;
    }

    const sourceStats = fs.statSync(source);
    if (!sourceStats.isDirectory()) {
        copyFile(source, target);
        return;
    }

    fs.mkdirSync(target, { recursive: true });
    for (const item of fs.readdirSync(source)) {
        copyDirectory(path.join(source, item), path.join(target, item));
    }
}

function patchElementBootstrapFiles(elmsOutputDir) {
    if (!fs.existsSync(elmsOutputDir)) {
        return;
    }

    for (const fileName of fs.readdirSync(elmsOutputDir)) {
        if (!/^elm_.+\.js$/.test(fileName)) {
            continue;
        }

        const language = fileName.replace(/^elm_/, "").replace(/\.js$/, "");
        const filePath = path.join(elmsOutputDir, fileName);
        let script = fs.readFileSync(filePath, "utf8");

        script = script.replace(
            /c\._ps\s*=\s*['"][^'";]+['"]\s*;/g,
            "c._ps = this.EDGE_TRANSLATE_URL + 'google/element_main.css';"
        );
        script = script.replace(
            /c\._plla\s*=\s*\w+\s*\+\s*['"][^'";]+['"]\s*;/g,
            `c._plla = this.EDGE_TRANSLATE_URL + 'google/lans/lan_${language}.js';`
        );
        script = script.replace(
            /_loadCss\(c\._ps\);[\s\n\r\t]*_loadJs\((?:['"][^'";]+['"]|this\.EDGE_TRANSLATE_URL\s*\+\s*['"]google\/element_main\.js['"])\);/g,
            "_loadCss(c._ps); _loadJs(this.EDGE_TRANSLATE_URL + 'google/element_main.js');"
        );

        fs.writeFileSync(filePath, script);
    }
}

function parseArgs(argv) {
    const args = {};
    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg === "--output-dir") {
            args.outputDir = argv[i + 1];
            i += 1;
        }
    }
    return args;
}

if (require.main === module) {
    const { outputDir } = parseArgs(process.argv.slice(2));
    if (!outputDir) {
        throw new Error("Missing required --output-dir argument.");
    }
    syncGoogleTranslateAssets({ outputDir });
}

module.exports = {
    getGoogleTranslateElementSnapshot,
    syncGoogleTranslateAssets,
};
