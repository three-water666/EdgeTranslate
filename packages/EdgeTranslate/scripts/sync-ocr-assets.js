const fs = require("fs");
const path = require("path");

const EDGE_TRANSLATE_DIR = path.resolve(__dirname, "..");
const OCR_OUTPUT_DIR = "ocr";

const TESSERACT_WORKER_FILES = [
    {
        source: "dist/worker.min.js",
        target: "worker.min.js",
    },
    {
        source: "dist/worker.min.js.LICENSE.txt",
        target: "worker.min.js.LICENSE.txt",
    },
];

const TESSERACT_CORE_FILES = ["tesseract-core-lstm.wasm", "tesseract-core-lstm.wasm.js"];

function syncOcrAssets({ outputDir }) {
    const absoluteOutputDir = path.resolve(EDGE_TRANSLATE_DIR, outputDir);
    const ocrOutputDir = path.join(absoluteOutputDir, OCR_OUTPUT_DIR);
    const tesseractRoot = resolvePackageRoot("tesseract.js");
    const tesseractCoreRoot = resolvePackageRoot("tesseract.js-core", [tesseractRoot]);

    fs.rmSync(ocrOutputDir, { recursive: true, force: true });

    for (const item of TESSERACT_WORKER_FILES) {
        copyPackageFile(tesseractRoot, item.source, path.join(ocrOutputDir, item.target));
    }

    for (const fileName of TESSERACT_CORE_FILES) {
        copyPackageFile(tesseractCoreRoot, fileName, path.join(ocrOutputDir, "core", fileName));
    }
}

function resolvePackageRoot(packageName, extraLookupRoots = []) {
    const packageJsonPath = require.resolve(`${packageName}/package.json`, {
        paths: [EDGE_TRANSLATE_DIR, ...extraLookupRoots],
    });
    return path.dirname(packageJsonPath);
}

function copyPackageFile(packageRoot, source, target) {
    const sourcePath = path.join(packageRoot, source);
    if (!fs.existsSync(sourcePath)) {
        throw new Error(`OCR asset source file is missing: ${sourcePath}`);
    }

    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(sourcePath, target);
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
    syncOcrAssets({ outputDir });
}

module.exports = {
    syncOcrAssets,
};
