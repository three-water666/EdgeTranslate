const fs = require("fs");
const path = require("path");
const stylusCompiler = require("stylus");
const { minify } = require("terser");
const { version } = require("../package.json");
const { syncGoogleTranslateAssets } = require("./sync-google-translate-assets");
const { syncOcrAssets } = require("./sync-ocr-assets");
const { syncPdfjsAssets } = require("./sync-pdfjs-assets");

const EDGE_TRANSLATE_DIR = path.resolve(__dirname, "..");
const PACKAGE_OUTPUT_DIR = path.join(EDGE_TRANSLATE_DIR, "artifacts");
const GOOGLE_PAGE_TRANSLATE_SOURCE_DIR = path.join(
    EDGE_TRANSLATE_DIR,
    "src",
    "content",
    "page_translate",
    "google"
);

function createBuildContext(environment, browser) {
    return {
        browser,
        environment,
        outputDir: getOutputDir(environment, browser),
        packageOutputDir: PACKAGE_OUTPUT_DIR,
        packagePath: getPackagePath(browser),
    };
}

function cleanOutput(context) {
    fs.rmSync(context.outputDir, { recursive: true, force: true });
    fs.rmSync(context.packagePath, { force: true });
    fs.mkdirSync(context.outputDir, { recursive: true });
}

async function copyManifest(context) {
    const sourcePath = path.join(EDGE_TRANSLATE_DIR, "src", `manifest_${context.browser}.json`);
    const manifest = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

    manifest.version = version;
    manifest.version_name = version;

    writeTextFile(
        path.join(context.outputDir, "manifest.json"),
        `${JSON.stringify(manifest, null, 4)}\n`
    );
}

async function copyHtml(context) {
    const sourceDir = path.join(EDGE_TRANSLATE_DIR, "src");
    const htmlFiles = listFiles(sourceDir).filter((filePath) => filePath.endsWith(".html"));

    for (const sourcePath of htmlFiles) {
        copyFileToOutput(sourcePath, sourceDir, context.outputDir);
    }
}

async function compileStylus(context) {
    const sourceDir = path.join(EDGE_TRANSLATE_DIR, "src");
    const stylusFiles = listFiles(sourceDir).filter(isBuildStylusFile);

    await Promise.all(
        stylusFiles.map((filePath) => compileStylusFile(filePath, sourceDir, context))
    );
}

async function copyStatic(context) {
    const staticDir = path.join(EDGE_TRANSLATE_DIR, "static");

    await Promise.all([
        copyStaticJs(context, staticDir),
        copyStaticOtherFiles(context, staticDir),
        copyGooglePageTranslateScripts(context),
    ]);
}

async function copyPdfViewer(context) {
    syncPdfjsAssets({ outputDir: context.outputDir });
}

async function copyGoogleTranslateAssets(context) {
    syncGoogleTranslateAssets({ outputDir: context.outputDir });
}

async function copyOcrAssets(context) {
    syncOcrAssets({ outputDir: context.outputDir });
}

async function touchHotReloadStamp(context) {
    if (context.environment !== "development") {
        return;
    }

    writeTextFile(
        path.join(context.outputDir, "hot-reload.json"),
        `${JSON.stringify({ updatedAt: Date.now() })}\n`
    );
}

function getOutputDir(environment, browser) {
    const outputRoot = environment === "development" ? "dev" : "build";

    return path.join(EDGE_TRANSLATE_DIR, outputRoot, browser);
}

function getPackagePath(browser) {
    const packageName = `edge_translate_${browser}_v${version}.zip`;

    return path.join(PACKAGE_OUTPUT_DIR, packageName);
}

function listFiles(dirPath) {
    if (!fs.existsSync(dirPath)) {
        return [];
    }

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    return entries.flatMap((entry) => {
        const entryPath = path.join(dirPath, entry.name);
        return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
    });
}

function isBuildStylusFile(filePath) {
    const sourceDir = path.join(EDGE_TRANSLATE_DIR, "src");
    const relativePath = toPosixPath(path.relative(sourceDir, filePath));

    return filePath.endsWith(".styl") && !relativePath.startsWith("common/");
}

function compileStylusFile(filePath, sourceDir, context) {
    return new Promise((resolve, reject) => {
        stylusCompiler(fs.readFileSync(filePath, "utf8"))
            .set("filename", filePath)
            .set("compress", true)
            .render((error, css) => {
                if (error) {
                    reject(error);
                    return;
                }

                writeTextFile(getOutputStylePath(filePath, sourceDir, context), css);
                resolve();
            });
    });
}

function getOutputStylePath(filePath, sourceDir, context) {
    const relativePath = path.relative(sourceDir, filePath).replace(/\.styl$/, ".css");

    return path.join(context.outputDir, relativePath);
}

async function copyStaticJs(context, staticDir) {
    const jsFiles = listFiles(staticDir).filter((filePath) => {
        const relativePath = toPosixPath(path.relative(staticDir, filePath));
        return filePath.endsWith(".js") && !isGeneratedStaticAsset(relativePath);
    });

    await Promise.all(jsFiles.map((filePath) => copyMinifiedJs(filePath, staticDir, context)));
}

async function copyGooglePageTranslateScripts(context) {
    const jsFiles = fs
        .readdirSync(GOOGLE_PAGE_TRANSLATE_SOURCE_DIR)
        .filter((fileName) => fileName.endsWith(".js"));

    await Promise.all(
        jsFiles.map((fileName) =>
            copyMinifiedJs(
                path.join(GOOGLE_PAGE_TRANSLATE_SOURCE_DIR, fileName),
                GOOGLE_PAGE_TRANSLATE_SOURCE_DIR,
                {
                    ...context,
                    outputDir: path.join(context.outputDir, "google"),
                }
            )
        )
    );
}

async function copyStaticOtherFiles(context, staticDir) {
    const staticFiles = listFiles(staticDir).filter((filePath) => {
        const relativePath = toPosixPath(path.relative(staticDir, filePath));
        return !filePath.endsWith(".js") && !isGeneratedStaticAsset(relativePath);
    });

    for (const sourcePath of staticFiles) {
        copyFileToOutput(sourcePath, staticDir, context.outputDir);
    }
}

async function copyMinifiedJs(sourcePath, sourceDir, context) {
    const source = fs.readFileSync(sourcePath, "utf8");
    const code =
        context.environment === "development" ? source : await minifyStaticJs(source, sourcePath);
    const relativePath = path.relative(sourceDir, sourcePath);

    writeTextFile(path.join(context.outputDir, relativePath), code);
}

async function minifyStaticJs(source, sourcePath) {
    const result = await minify(source, { module: false });

    if (!result.code) {
        throw new Error(`Terser produced empty output for ${sourcePath}.`);
    }

    return result.code;
}

function isGeneratedStaticAsset(relativePath) {
    return relativePath.startsWith("ocr/") || relativePath.startsWith("pdf/");
}

function copyFileToOutput(sourcePath, sourceDir, outputDir) {
    const targetPath = path.join(outputDir, path.relative(sourceDir, sourcePath));

    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(sourcePath, targetPath);
}

function writeTextFile(filePath, text) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, text);
}

function toPosixPath(filePath) {
    return filePath.split(path.sep).join("/");
}

module.exports = {
    EDGE_TRANSLATE_DIR,
    GOOGLE_PAGE_TRANSLATE_SOURCE_DIR,
    cleanOutput,
    compileStylus,
    copyGoogleTranslateAssets,
    copyHtml,
    copyManifest,
    copyOcrAssets,
    copyPdfViewer,
    copyStatic,
    createBuildContext,
    listFiles,
    touchHotReloadStamp,
    toPosixPath,
};
