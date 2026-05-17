/* eslint-disable quotes */
const fs = require("fs");
const path = require("path");

const EDGE_TRANSLATE_DIR = path.resolve(__dirname, "..");
const PDFJS_VERSION = "5.7.284";
const PDFJS_VENDOR_DIR = path.join(EDGE_TRANSLATE_DIR, "vendor", "pdfjs", PDFJS_VERSION);
const PDF_OUTPUT_DIR = "pdf";

const OMITTED_VENDOR_FILES = new Set([
    "build/pdf.mjs.map",
    "build/pdf.sandbox.mjs.map",
    "build/pdf.worker.mjs.map",
    "web/compressed.tracemonkey-pldi-09.pdf",
    "web/viewer.mjs.map",
]);

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

    copyDirectory(PDFJS_VENDOR_DIR, pdfOutputDir);
    patchRuntimeCompatibility(pdfOutputDir);
    patchViewerHtml(path.join(pdfOutputDir, "web", "viewer.html"));
    patchViewerMjs(path.join(pdfOutputDir, "web", "viewer.mjs"));
}

function copyFile(source, target) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
}

function copyDirectory(source, target, root = source) {
    if (!fs.existsSync(source)) {
        return;
    }

    const relativePath = toPosixPath(path.relative(root, source));
    if (OMITTED_VENDOR_FILES.has(relativePath)) {
        return;
    }

    const sourceStats = fs.statSync(source);
    if (!sourceStats.isDirectory()) {
        copyFile(source, target);
        return;
    }

    fs.mkdirSync(target, { recursive: true });
    for (const item of fs.readdirSync(source)) {
        copyDirectory(path.join(source, item), path.join(target, item), root);
    }
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
