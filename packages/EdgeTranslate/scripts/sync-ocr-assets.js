/* eslint-disable quotes */
const fs = require("fs");
const path = require("path");
const webpack = require("webpack");

const EDGE_TRANSLATE_DIR = path.resolve(__dirname, "..");
const OCR_OUTPUT_DIR = "ocr";
const TESSERACT_WORKER_ENTRY = "src/worker-script/browser/index.js";
const TESSERACT_WORKER_FILE = "worker.js";
const TESSERACT_WORKER_LICENSE_SOURCE = "dist/worker.min.js.LICENSE.txt";
const TESSERACT_WORKER_LICENSE_FILE = `${TESSERACT_WORKER_FILE}.LICENSE.txt`;
const TESSERACT_BROWSER_WORKER_CONTEXT = toPosixPath(path.join("src", "worker-script", "browser"));
const TESSERACT_GET_CORE_SHIM = path.join(__dirname, "ocr-tesseract-get-core.js");

const TESSERACT_CORE_FILES = ["tesseract-core-lstm.wasm", "tesseract-core-lstm.js"];

const TESSERACT_WORKER_CSP_FORBIDDEN_PATTERNS = [
    /Function\("r", "regeneratorRuntime = r"\)/,
    /new Function\('return this'\)/,
];

async function syncOcrAssets({ outputDir }) {
    const absoluteOutputDir = path.resolve(EDGE_TRANSLATE_DIR, outputDir);
    const ocrOutputDir = path.join(absoluteOutputDir, OCR_OUTPUT_DIR);
    const tesseractRoot = resolvePackageRoot("tesseract.js");
    const tesseractCoreRoot = resolvePackageRoot("tesseract.js-core", [tesseractRoot]);

    fs.rmSync(ocrOutputDir, { recursive: true, force: true });

    await buildTesseractWorker(tesseractRoot, ocrOutputDir);
    copyPackageFile(
        tesseractRoot,
        TESSERACT_WORKER_LICENSE_SOURCE,
        path.join(ocrOutputDir, TESSERACT_WORKER_LICENSE_FILE)
    );
    copyTesseractCoreFiles(tesseractCoreRoot, ocrOutputDir);
}

function copyTesseractCoreFiles(tesseractCoreRoot, ocrOutputDir) {
    for (const fileName of TESSERACT_CORE_FILES) {
        copyPackageFile(tesseractCoreRoot, fileName, path.join(ocrOutputDir, "core", fileName));
    }
}

async function buildTesseractWorker(tesseractRoot, ocrOutputDir) {
    const compiler = webpack(createTesseractWorkerConfig(tesseractRoot, ocrOutputDir));

    await new Promise((resolve, reject) => {
        compiler.run((error, stats) => {
            finishWebpackRun(compiler, error, stats).then(resolve, reject);
        });
    });
    patchTesseractWorkerRuntime(path.join(ocrOutputDir, TESSERACT_WORKER_FILE));
}

async function finishWebpackRun(compiler, error, stats) {
    try {
        assertWebpackSuccess(error, stats);
    } finally {
        await closeCompiler(compiler);
    }
}

function createTesseractWorkerConfig(tesseractRoot, ocrOutputDir) {
    return {
        context: tesseractRoot,
        devtool: false,
        entry: path.join(tesseractRoot, TESSERACT_WORKER_ENTRY),
        mode: "none",
        optimization: {
            minimize: false,
        },
        output: {
            filename: TESSERACT_WORKER_FILE,
            globalObject: "self",
            path: ocrOutputDir,
        },
        performance: {
            hints: false,
        },
        plugins: [
            createTesseractGetCoreReplacement(),
            new webpack.ProvidePlugin({ Buffer: ["buffer", "Buffer"] }),
        ],
        resolve: {
            fallback: {
                buffer: require.resolve("buffer/", { paths: [EDGE_TRANSLATE_DIR, tesseractRoot] }),
            },
        },
        target: "webworker",
    };
}

function createTesseractGetCoreReplacement() {
    return new webpack.NormalModuleReplacementPlugin(/\.\/getCore$/, (resource) => {
        if (isTesseractBrowserWorkerContext(resource.context)) {
            resource.request = TESSERACT_GET_CORE_SHIM;
        }
    });
}

function isTesseractBrowserWorkerContext(context) {
    return toPosixPath(context).endsWith(TESSERACT_BROWSER_WORKER_CONTEXT);
}

function patchTesseractWorkerRuntime(workerPath) {
    let script = fs.readFileSync(workerPath, "utf8");
    const patches = [
        {
            search: [
                '  if (typeof globalThis === "object") {',
                "    globalThis.regeneratorRuntime = runtime;",
                "  } else {",
                '    Function("r", "regeneratorRuntime = r")(runtime);',
                "  }",
            ].join("\n"),
            replacement: [
                '  if (typeof globalThis === "object") {',
                "    globalThis.regeneratorRuntime = runtime;",
                '  } else if (typeof self === "object") {',
                "    self.regeneratorRuntime = runtime;",
                "  }",
            ].join("\n"),
        },
        {
            search: [
                "/******/ \t\t__webpack_require__.g = (function() {",
                "/******/ \t\t\tif (typeof globalThis === 'object') return globalThis;",
                "/******/ \t\t\ttry {",
                "/******/ \t\t\t\treturn this || new Function('return this')();",
                "/******/ \t\t\t} catch (e) {",
                "/******/ \t\t\t\tif (typeof window === 'object') return window;",
                "/******/ \t\t\t}",
                "/******/ \t\t})();",
            ].join("\n"),
            replacement: [
                "/******/ \t\t__webpack_require__.g = (function() {",
                "/******/ \t\t\tif (typeof globalThis === 'object') return globalThis;",
                "/******/ \t\t\tif (typeof self === 'object') return self;",
                "/******/ \t\t\tif (typeof window === 'object') return window;",
                "/******/ \t\t})();",
            ].join("\n"),
        },
    ];

    for (const patch of patches) {
        const nextScript = script.replace(patch.search, patch.replacement);
        if (nextScript === script) {
            throw new Error("Unable to patch Tesseract worker CSP fallback.");
        }
        script = nextScript;
    }

    assertNoForbiddenTesseractWorkerRuntime(script);
    fs.writeFileSync(workerPath, script);
}

function assertNoForbiddenTesseractWorkerRuntime(script) {
    for (const pattern of TESSERACT_WORKER_CSP_FORBIDDEN_PATTERNS) {
        if (pattern.test(script)) {
            throw new Error(
                `Tesseract worker still contains forbidden runtime pattern: ${pattern}`
            );
        }
    }
}

function assertWebpackSuccess(error, stats) {
    if (error) {
        throw error;
    }

    if (stats && stats.hasErrors()) {
        throw new Error(stats.toString({ all: false, errors: true, colors: true }));
    }
}

function closeCompiler(compiler) {
    return new Promise((resolve, reject) => {
        compiler.close((error) => (error ? reject(error) : resolve()));
    });
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

function toPosixPath(filePath) {
    return filePath.split(path.sep).join("/");
}

if (require.main === module) {
    const { outputDir } = parseArgs(process.argv.slice(2));
    if (!outputDir) {
        throw new Error("Missing required --output-dir argument.");
    }

    syncOcrAssets({ outputDir }).catch((error) => {
        console.error(error.stack || error);
        process.exit(1);
    });
}

module.exports = {
    syncOcrAssets,
};
