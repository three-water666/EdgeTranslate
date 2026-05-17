const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const AdmZip = require("adm-zip");
const webpack = require("webpack");
const {
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
} = require("./build-extension-assets");

function parseArgs(argv) {
    const args = { browser: "chrome", command: argv[0] };

    for (let index = 1; index < argv.length; index += 1) {
        if (argv[index] === "--browser") {
            args.browser = argv[index + 1] || args.browser;
            index += 1;
        }
    }

    return args;
}

function printUsage() {
    console.error("Usage: node scripts/build-extension.js <build|dev|package> [--browser chrome]");
}

async function buildExtension({ browser }) {
    const context = createBuildContext("production", browser);

    cleanOutput(context);
    await Promise.all([runEslint(), runWebpack(context), runAssetBuild(context)]);
}

async function devExtension({ browser }) {
    const context = createBuildContext("development", browser);

    cleanOutput(context);
    await runAssetBuild(context);
    await touchHotReloadStamp(context);
    await runWebpackWatch(context);
}

async function packageExtension({ browser }) {
    const context = createBuildContext("production", browser);
    const zip = new AdmZip();

    fs.mkdirSync(context.packageOutputDir, { recursive: true });
    fs.rmSync(context.packagePath, { force: true });
    addDirectoryToZip(zip, context.outputDir, context.outputDir);
    zip.writeZip(context.packagePath);
}

async function runAssetBuild(context) {
    await Promise.all([
        copyManifest(context),
        copyHtml(context),
        compileStylus(context),
        copyStatic(context),
        copyGoogleTranslateAssets(context),
        copyOcrAssets(context),
        copyPdfViewer(context),
    ]);
}

function runEslint() {
    const repoRoot = path.resolve(EDGE_TRANSLATE_DIR, "../..");
    const result = spawnSync(
        "node",
        [
            path.join(repoRoot, "scripts", "run-eslint.js"),
            "packages/EdgeTranslate",
            ".eslintrc.js",
            "scripts/**/*.js",
            "src/**/*.{js,jsx}",
            "config/**/*.js",
            "utils/**/*.js",
            "test/**/*.js",
        ],
        { cwd: EDGE_TRANSLATE_DIR, stdio: "inherit", shell: process.platform === "win32" }
    );

    if (result.error) {
        throw result.error;
    }

    if (result.status !== 0) {
        throw new Error(`eslint exited with code ${result.status}`);
    }
}

function runWebpack(context) {
    const compiler = webpack(createWebpackConfig(context));

    return new Promise((resolve, reject) => {
        compiler.run((error, stats) => {
            finishWebpackRun(compiler, error, stats).then(resolve, reject);
        });
    });
}

function runWebpackWatch(context) {
    const watcher = watchAssets(context);
    const compiler = webpack(createWebpackConfig(context));
    const watching = compiler.watch({ aggregateTimeout: 300 }, logWebpackResult);

    bindShutdown(watcher, watching);
    return new Promise(() => {});
}

async function finishWebpackRun(compiler, error, stats) {
    try {
        assertWebpackSuccess(error, stats);
        logWebpackStats(stats);
    } finally {
        await closeCompiler(compiler);
    }
}

function logWebpackResult(error, stats) {
    try {
        assertWebpackSuccess(error, stats);
        logWebpackStats(stats);
    } catch (buildError) {
        console.error(buildError.stack || buildError);
    }
}

function createWebpackConfig(context) {
    const config = require(getWebpackConfigPath(context.environment));
    const plugins = [...(config.plugins || []), createEnvironmentPlugin(context)];

    if (context.environment === "development") {
        plugins.push(createHotReloadStampPlugin());
    }

    return {
        ...config,
        context: EDGE_TRANSLATE_DIR,
        entry: normalizeWebpackEntries(config.entry),
        output: { ...config.output, path: context.outputDir },
        plugins,
        watch: false,
    };
}

function getWebpackConfigPath(environment) {
    const fileName =
        environment === "production" ? "webpack.prod.config.js" : "webpack.dev.config.js";

    return path.join(EDGE_TRANSLATE_DIR, "config", fileName);
}

function createEnvironmentPlugin(context) {
    return new webpack.DefinePlugin({
        BROWSER_ENV: JSON.stringify(context.browser),
        BUILD_ENV: JSON.stringify(context.environment),
    });
}

function normalizeWebpackEntries(entry) {
    return Object.fromEntries(
        Object.entries(entry).map(([name, value]) => [name.replace(/^\/+/, ""), value])
    );
}

function createHotReloadStampPlugin() {
    return {
        apply(compiler) {
            compiler.hooks.thisCompilation.tap("HotReloadStampPlugin", (compilation) => {
                compilation.hooks.processAssets.tap(
                    {
                        name: "HotReloadStampPlugin",
                        stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
                    },
                    () => emitHotReloadStamp(compilation)
                );
            });
        },
    };
}

function emitHotReloadStamp(compilation) {
    const source = `${JSON.stringify({ updatedAt: Date.now() })}\n`;

    compilation.emitAsset("hot-reload.json", new webpack.sources.RawSource(source));
}

function watchAssets(context) {
    const schedule = createTaskScheduler(context);
    const watchedPaths = getWatchedPaths(context);
    const watchers = watchedPaths.map((watchedPath) => watchPath(watchedPath, schedule));

    return {
        close: () => Promise.all(watchers.map((watcher) => closeWatcher(watcher))),
    };
}

function getWatchedPaths(context) {
    return [
        path.join(EDGE_TRANSLATE_DIR, "src"),
        path.join(EDGE_TRANSLATE_DIR, "static"),
        path.join(EDGE_TRANSLATE_DIR, "vendor", "pdfjs"),
        path.join(EDGE_TRANSLATE_DIR, "vendor", "google-translate-element"),
        path.join(EDGE_TRANSLATE_DIR, "scripts", "sync-pdfjs-assets.js"),
        path.join(EDGE_TRANSLATE_DIR, "scripts", "sync-google-translate-assets.js"),
        path.join(EDGE_TRANSLATE_DIR, "scripts", "sync-ocr-assets.js"),
        path.join(EDGE_TRANSLATE_DIR, "src", `manifest_${context.browser}.json`),
    ];
}

function watchPath(watchedPath, schedule) {
    const isDirectory = fs.statSync(watchedPath).isDirectory();
    const options = isDirectory ? { recursive: true } : {};

    return fs.watch(watchedPath, options, (eventName, fileName) => {
        const filePath = isDirectory && fileName ? path.join(watchedPath, fileName) : watchedPath;
        scheduleAssetTask(schedule, filePath);
    });
}

function scheduleAssetTask(schedule, filePath) {
    const relativePath = toPosixPath(path.relative(EDGE_TRANSLATE_DIR, filePath));

    if (relativePath.endsWith(".html")) return schedule("html", copyHtml);
    if (relativePath.endsWith(".styl")) return schedule("stylus", compileStylus);
    if (isManifestPath(relativePath)) return schedule("manifest", copyManifest);
    if (isStaticPath(relativePath)) return schedule("static", copyStatic);
    if (isGoogleBridgePath(filePath)) return schedule("static", copyStatic);
    if (isPdfAssetPath(relativePath)) return schedule("pdf", copyPdfViewer);
    if (isGoogleAssetPath(relativePath)) return schedule("google", copyGoogleTranslateAssets);
    if (relativePath === "scripts/sync-ocr-assets.js") return schedule("ocr", copyOcrAssets);
}

function createTaskScheduler(context) {
    const runningTasks = new Map();

    return (taskName, task) => {
        if (runningTasks.has(taskName)) {
            return;
        }

        const taskPromise = runWatchedTask(taskName, task, context).finally(() => {
            runningTasks.delete(taskName);
        });
        runningTasks.set(taskName, taskPromise);
    };
}

async function runWatchedTask(taskName, task, context) {
    try {
        await task(context);
        await touchHotReloadStamp(context);
        console.log(`Updated ${taskName}.`);
    } catch (error) {
        console.error(error.stack || error);
    }
}

function isManifestPath(relativePath) {
    return /^src\/manifest_.+\.json$/.test(relativePath);
}

function isStaticPath(relativePath) {
    return relativePath.startsWith("static/");
}

function isGoogleBridgePath(filePath) {
    return filePath.startsWith(GOOGLE_PAGE_TRANSLATE_SOURCE_DIR) && filePath.endsWith(".js");
}

function isPdfAssetPath(relativePath) {
    return (
        relativePath.startsWith("vendor/pdfjs/") || relativePath === "scripts/sync-pdfjs-assets.js"
    );
}

function isGoogleAssetPath(relativePath) {
    return (
        relativePath.startsWith("vendor/google-translate-element/") ||
        relativePath === "scripts/sync-google-translate-assets.js"
    );
}

function assertWebpackSuccess(error, stats) {
    if (error) {
        throw error;
    }

    if (stats && stats.hasErrors()) {
        throw new Error(stats.toString({ all: false, errors: true, colors: true }));
    }
}

function logWebpackStats(stats) {
    if (stats) {
        console.log(stats.toString({ colors: true }));
    }
}

function closeCompiler(compiler) {
    return new Promise((resolve, reject) => {
        compiler.close((error) => (error ? reject(error) : resolve()));
    });
}

function bindShutdown(watcher, watching) {
    const shutdown = () => {
        Promise.all([watcher.close(), closeWatching(watching)]).finally(() => process.exit());
    };

    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
}

function closeWatching(watching) {
    return new Promise((resolve, reject) => {
        watching.close((error) => (error ? reject(error) : resolve()));
    });
}

function closeWatcher(watcher) {
    watcher.close();
    return Promise.resolve();
}

function addDirectoryToZip(zip, sourceDir, baseDir) {
    for (const filePath of listFiles(sourceDir)) {
        const relativePath = toPosixPath(path.relative(baseDir, filePath));
        zip.addFile(relativePath, fs.readFileSync(filePath));
    }
}

module.exports = {
    buildExtension,
    devExtension,
    packageExtension,
    parseArgs,
    printUsage,
};
