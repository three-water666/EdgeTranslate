const fs = require("fs");
const path = require("path");
const {
    EDGE_TRANSLATE_DIR,
    GOOGLE_PAGE_TRANSLATE_SOURCE_DIR,
    compileStylus,
    copyGoogleTranslateAssets,
    copyHtml,
    copyManifest,
    copyOcrAssets,
    copyPdfViewer,
    copyStatic,
    touchHotReloadStamp,
    toPosixPath,
} = require("./build-extension-assets");

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
        if (isDirectory && !fileName) {
            scheduleDirectoryAssetTasks(schedule, watchedPath);
            return;
        }

        const filePath = isDirectory ? path.join(watchedPath, fileName) : watchedPath;
        scheduleAssetTask(schedule, filePath);
    });
}

function scheduleDirectoryAssetTasks(schedule, watchedPath) {
    const relativePath = toPosixPath(path.relative(EDGE_TRANSLATE_DIR, watchedPath));

    if (relativePath === "src") {
        schedule("html", copyHtml);
        schedule("stylus", compileStylus);
        schedule("manifest", copyManifest);
        schedule("static", copyStatic);
        return;
    }

    if (relativePath === "static") return schedule("static", copyStatic);
    if (relativePath === "vendor/pdfjs") return schedule("pdf", copyPdfViewer);
    if (relativePath === "vendor/google-translate-element") {
        return schedule("google", copyGoogleTranslateAssets);
    }
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

function closeWatcher(watcher) {
    watcher.close();
    return Promise.resolve();
}

module.exports = {
    watchAssets,
};
