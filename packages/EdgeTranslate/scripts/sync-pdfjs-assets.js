/* eslint-disable quotes */
const fs = require("fs");
const path = require("path");

const EDGE_TRANSLATE_DIR = path.resolve(__dirname, "..");
const PDFJS_VENDOR_ROOT = path.join(EDGE_TRANSLATE_DIR, "vendor", "pdfjs");
const PDF_OUTPUT_DIR = "pdf";

const PDFJS_DIST_BUILD_FILES = ["pdf.mjs", "pdf.sandbox.mjs", "pdf.worker.mjs"];

const PDFJS_DIST_WEB_DIRECTORIES = ["cmaps", "iccs", "images", "standard_fonts", "wasm"];

const PDFJS_VIEWER_APP_PATHS = [
    "LICENSE",
    "web/debugger.css",
    "web/debugger.mjs",
    "web/locale",
    "web/viewer.css",
    "web/viewer.html",
    "web/viewer.mjs",
];

const EDGE_TRANSLATE_STYLES = [
    '<link rel="stylesheet" href="../../content/select/select.css" />',
].join("\n");

const EDGE_TRANSLATE_SCRIPTS = [
    '<script defer src="../../content/select/select.js"></script>',
    '<script defer src="../../content/display/display.js"></script>',
].join("\n");

const PDFJS_RUNTIME_COMPAT_PATCH = [
    "/* Edge Translate PDF.js runtime compatibility patch. */",
    "(() => {",
    '  if (typeof Promise.withResolvers !== "function") {',
    "    Promise.withResolvers = function () {",
    "      let resolve;",
    "      let reject;",
    "      const promise = new Promise((res, rej) => {",
    "        resolve = res;",
    "        reject = rej;",
    "      });",
    "      return { promise, resolve, reject };",
    "    };",
    "  }",
    '  if (typeof Object.hasOwn !== "function") {',
    "    Object.hasOwn = function (object, property) {",
    "      return Object.prototype.hasOwnProperty.call(Object(object), property);",
    "    };",
    "  }",
    "  const arrayAt = function (index) {",
    "    const length = this.length >>> 0;",
    "    let relativeIndex = Number(index) || 0;",
    "    if (relativeIndex < 0) {",
    "      relativeIndex += length;",
    "    }",
    "    return relativeIndex < 0 || relativeIndex >= length ? undefined : this[relativeIndex];",
    "  };",
    '  if (typeof Array.prototype.at !== "function") {',
    '    Object.defineProperty(Array.prototype, "at", { value: arrayAt, configurable: true });',
    "  }",
    '  if (typeof Array.prototype.findLast !== "function") {',
    '    Object.defineProperty(Array.prototype, "findLast", {',
    "      value: function (predicate, thisArg) {",
    "        for (let i = this.length - 1; i >= 0; i -= 1) {",
    "          const value = this[i];",
    "          if (predicate.call(thisArg, value, i, this)) {",
    "            return value;",
    "          }",
    "        }",
    "        return undefined;",
    "      },",
    "      configurable: true,",
    "    });",
    "  }",
    '  if (typeof Array.prototype.toSorted !== "function") {',
    '    Object.defineProperty(Array.prototype, "toSorted", {',
    "      value: function (compareFn) { return Array.prototype.slice.call(this).sort(compareFn); },",
    "      configurable: true,",
    "    });",
    "  }",
    "  const typedArrays = [",
    "    Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array,",
    "    Int32Array, Uint32Array, Float32Array, Float64Array,",
    '    typeof BigInt64Array === "undefined" ? null : BigInt64Array,',
    '    typeof BigUint64Array === "undefined" ? null : BigUint64Array,',
    "  ].filter(Boolean);",
    "  for (const TypedArray of typedArrays) {",
    '    if (typeof TypedArray.prototype.at !== "function") {',
    '      Object.defineProperty(TypedArray.prototype, "at", {',
    "        value: arrayAt,",
    "        configurable: true,",
    "      });",
    "    }",
    "  }",
    '  if (typeof RegExp.escape !== "function") {',
    "    RegExp.escape = function (string) {",
    '      return String(string).replace(/[\\\\^$.*+?()[\\]{}|/]/g, "\\\\$&").replace(/-/g, "\\\\x2d");',
    "    };",
    "  }",
    "})();",
    "",
].join("\n");

const PDFJS_RUNTIME_PATCH_FILES = [
    "build/pdf.mjs",
    "build/pdf.sandbox.mjs",
    "build/pdf.worker.mjs",
    "web/debugger.mjs",
    "web/viewer.mjs",
];

function syncPdfjsAssets({ outputDir }) {
    const absoluteOutputDir = path.resolve(EDGE_TRANSLATE_DIR, outputDir);
    const pdfOutputDir = path.join(absoluteOutputDir, PDF_OUTPUT_DIR);
    const pdfjsDistDir = resolvePackageRoot("pdfjs-dist");
    const pdfjsVersion = getPackageVersion(pdfjsDistDir);
    const pdfjsViewerAppDir = path.join(PDFJS_VENDOR_ROOT, pdfjsVersion);

    assertPdfjsDistComplete(pdfjsDistDir);
    assertViewerAppComplete(pdfjsViewerAppDir);
    fs.rmSync(pdfOutputDir, { recursive: true, force: true });
    copyViewerAppFiles(pdfjsViewerAppDir, pdfOutputDir);
    copyPdfjsDistRuntimeFiles(pdfjsDistDir, pdfOutputDir);
    patchRuntimeCompatibility(pdfOutputDir);
    patchViewerHtml(path.join(pdfOutputDir, "web", "viewer.html"));
    patchViewerMjs(path.join(pdfOutputDir, "web", "viewer.mjs"));
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

function copyViewerAppFiles(pdfjsViewerAppDir, pdfOutputDir) {
    for (const relativePath of PDFJS_VIEWER_APP_PATHS) {
        copyDirectory(
            path.join(pdfjsViewerAppDir, relativePath),
            path.join(pdfOutputDir, relativePath)
        );
    }
}

function copyPdfjsDistRuntimeFiles(pdfjsDistDir, pdfOutputDir) {
    for (const fileName of PDFJS_DIST_BUILD_FILES) {
        copyFile(
            path.join(pdfjsDistDir, "build", fileName),
            path.join(pdfOutputDir, "build", fileName)
        );
    }

    for (const directoryName of PDFJS_DIST_WEB_DIRECTORIES) {
        copyDirectory(
            path.join(pdfjsDistDir, directoryName === "images" ? "web" : "", directoryName),
            path.join(pdfOutputDir, "web", directoryName)
        );
    }
}

function assertPdfjsDistComplete(pdfjsDistDir) {
    const requiredPaths = [
        ...PDFJS_DIST_BUILD_FILES.map((fileName) => path.join("build", fileName)),
        ...PDFJS_DIST_WEB_DIRECTORIES.map((directoryName) =>
            path.join(directoryName === "images" ? "web" : "", directoryName)
        ),
    ];

    assertPathsExist(pdfjsDistDir, requiredPaths, "pdfjs-dist package");
}

function assertViewerAppComplete(pdfjsViewerAppDir) {
    assertPathsExist(pdfjsViewerAppDir, PDFJS_VIEWER_APP_PATHS, "PDF.js viewer app vendor");
}

function assertPathsExist(rootDir, relativePaths, label) {
    for (const relativePath of relativePaths) {
        const fullPath = path.join(rootDir, relativePath);
        if (!fs.existsSync(fullPath)) {
            throw new Error(`${label} is missing ${toPosixPath(relativePath)}.`);
        }
    }
}

function resolvePackageRoot(packageName) {
    const packageJsonPath = require.resolve(`${packageName}/package.json`, {
        paths: [EDGE_TRANSLATE_DIR],
    });
    return path.dirname(packageJsonPath);
}

function getPackageVersion(packageRoot) {
    const packageJson = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"));
    return packageJson.version;
}

function patchViewerHtml(viewerHtmlPath) {
    let html = fs.readFileSync(viewerHtmlPath, "utf8");
    if (!html.includes(EDGE_TRANSLATE_STYLES)) {
        html = html.replace(
            '<link rel="stylesheet" href="viewer.css" />',
            `<link rel="stylesheet" href="viewer.css" />\n${EDGE_TRANSLATE_STYLES}`
        );
    }
    if (!html.includes(EDGE_TRANSLATE_SCRIPTS)) {
        html = html.replace(
            '<script src="viewer.mjs" type="module"></script>',
            `${EDGE_TRANSLATE_SCRIPTS}\n<script src="viewer.mjs" type="module"></script>`
        );
    }
    fs.writeFileSync(viewerHtmlPath, html);
}

function patchRuntimeCompatibility(pdfOutputDir) {
    for (const relativePath of PDFJS_RUNTIME_PATCH_FILES) {
        const filePath = path.join(pdfOutputDir, relativePath);
        if (!fs.existsSync(filePath)) {
            continue;
        }
        const script = fs.readFileSync(filePath, "utf8");
        fs.writeFileSync(filePath, `${PDFJS_RUNTIME_COMPAT_PATCH}${script}`);
    }
}

function patchViewerMjs(viewerMjsPath) {
    let script = fs.readFileSync(viewerMjsPath, "utf8");
    script = script.replace('value: "compressed.tracemonkey-pldi-09.pdf"', 'value: ""');
    script = script.replace(
        "var validateFileURL = function (file) {",
        [
            "const isEdgeTranslateViewerOrigin = origin =>",
            '  origin.startsWith("chrome-extension://") ||',
            '  origin.startsWith("extension://") ||',
            '  origin.startsWith("moz-extension://");',
            "  var validateFileURL = function (file) {",
        ].join("\n")
    );
    script = script.replace(
        "if (HOSTED_VIEWER_ORIGINS.has(viewerOrigin)) {",
        "if (isEdgeTranslateViewerOrigin(viewerOrigin) || HOSTED_VIEWER_ORIGINS.has(viewerOrigin)) {"
    );
    fs.writeFileSync(viewerMjsPath, script);
}

function toPosixPath(filePath) {
    return filePath.split(path.sep).join("/");
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
    syncPdfjsAssets({ outputDir });
}

module.exports = {
    syncPdfjsAssets,
};
