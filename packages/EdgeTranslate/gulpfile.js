const del = require("del");
const fs = require("fs");
const gulp = require("gulp");
const { syncGoogleTranslateAssets } = require("./scripts/sync-google-translate-assets");
const { syncOcrAssets } = require("./scripts/sync-ocr-assets");
const { syncPdfjsAssets } = require("./scripts/sync-pdfjs-assets");
const stylusCompiler = require("stylus");
const through = require("through2");
const webpack = require("webpack");
const webpack_stream = require("webpack-stream");
const zip = require("gulp-zip");
const terser = require("gulp-terser");
const mergeStream = require("merge-stream");
const minimist = require("minimist");
const { spawn, spawnSync } = require("child_process");
const { version } = require("./package.json");

let args = minimist(process.argv.slice(2));
let browser = args.browser || "chrome";
let environment; // store the type of environment: enum{production,development}
const PACKAGE_OUTPUT_DIR = "./artifacts";
const GOOGLE_PAGE_TRANSLATE_SOURCE_DIR = "./src/content/page_translate/google";

/**
 * Define public tasks of gulp
 */

/**
 *
 * A public task to build JS in development mode
 *
 * Hint: The watch mode of webpack in development mode will block the current gulp task. So this task need to to be run independently in command line in another process
 */
exports.buildJS = gulp.series(setDevelopEnvironment, buildJS);

/**
 * A public task to build a package in development mode and watch code changes.
 */
exports.dev = gulp.series(
    setDevelopEnvironment,
    clean,
    ensureOutputDirectory,
    gulp.parallel(
        buildJSDev,
        copyManifest,
        html,
        styl,
        packStatic,
        googleTranslateAssets,
        ocrAssets,
        pdfViewer,
        touchHotReloadStamp
    ),
    watcher
);

/**
 * A public task to build a package in production mode
 */
exports.build = gulp.series(
    setProductEnvironment,
    clean,
    ensureOutputDirectory,
    gulp.parallel(
        eslintJS,
        buildJS,
        copyManifest,
        html,
        styl,
        packStatic,
        googleTranslateAssets,
        ocrAssets,
        pdfViewer
    )
);

/**
 * A public task to build and zip a package in production mode
 */
exports.pack = gulp.series(packToZip);
/**
 * End public tasks' definition
 */

/**
 * Define private tasks of gulp
 */

/**
 * A private task to set development execution environment
 */
function setDevelopEnvironment(done) {
    environment = "development";
    done();
}

/**
 * A private task to set production execution environment
 */
function setProductEnvironment(done) {
    environment = "production";
    done();
}

/**
 * A private task to clean old packages before building new ones
 */
function clean() {
    let output_dir = getOutputDir();
    let packageName = `edge_translate_${browser}_v${version}.zip`;
    return del([output_dir, `${PACKAGE_OUTPUT_DIR}/${packageName}`]);
}

function ensureOutputDirectory(done) {
    fs.mkdirSync(getOutputDir(), { recursive: true });
    done();
}

function touchHotReloadStamp(done) {
    if (environment !== "development") {
        done();
        return;
    }

    const stampPath = `${getOutputDir()}hot-reload.json`;
    fs.writeFileSync(stampPath, `${JSON.stringify({ updatedAt: Date.now() })}\n`);
    done();
}

/**
 * A private task to zip the built package
 */
function packToZip() {
    let match_dir = `./build/${browser}/**/*`;
    let packageName = `edge_translate_${browser}_v${version}.zip`;
    return gulp.src(match_dir).pipe(zip(packageName)).pipe(gulp.dest(PACKAGE_OUTPUT_DIR));
}

/**
 * A private task to watch change of code and update the package immediately
 * @param {Function} done execute done to inform gulp that the task is finished
 */
function watcher(done) {
    gulp.watch("./src/manifest_chrome.json").on(
        "change",
        gulp.series(copyManifest, touchHotReloadStamp)
    );
    gulp.watch("./src/**/*.html").on("change", gulp.series(html, touchHotReloadStamp));
    gulp.watch("./vendor/pdfjs/**/*").on("change", gulp.series(pdfViewer, touchHotReloadStamp));
    gulp.watch("./scripts/sync-pdfjs-assets.js").on(
        "change",
        gulp.series(pdfViewer, touchHotReloadStamp)
    );
    gulp.watch("./vendor/google-translate-element/**/*").on(
        "change",
        gulp.series(googleTranslateAssets, touchHotReloadStamp)
    );
    gulp.watch("./scripts/sync-google-translate-assets.js").on(
        "change",
        gulp.series(googleTranslateAssets, touchHotReloadStamp)
    );
    gulp.watch("./scripts/sync-ocr-assets.js").on(
        "change",
        gulp.series(ocrAssets, touchHotReloadStamp)
    );
    gulp.watch("./static/**/*").on("change", gulp.series(packStatic, touchHotReloadStamp));
    gulp.watch(`${GOOGLE_PAGE_TRANSLATE_SOURCE_DIR}/**/*.js`).on(
        "change",
        gulp.series(packStatic, touchHotReloadStamp)
    );
    gulp.watch("./src/**/*.styl").on("change", gulp.series(styl, touchHotReloadStamp));
    done();
}

/**
 * A private task to run eslint check for JS code
 */
function eslintJS(done) {
    const result = spawnSync(
        "node",
        [
            "../../scripts/run-eslint.js",
            "packages/EdgeTranslate",
            ".eslintrc.js",
            "gulpfile.js",
            "scripts/**/*.js",
            "src/**/*.{js,jsx}",
            "config/**/*.js",
            "utils/**/*.js",
            "test/**/*.js",
        ],
        {
            stdio: "inherit",
            shell: true,
        }
    );

    if (result.error) {
        done(result.error);
        return;
    }

    if (result.status !== 0) {
        done(new Error(`eslint exited with code ${result.status}`));
        return;
    }

    done();
}

/**
 * A private code to build JS code
 */
function buildJS() {
    let output_dir = getOutputDir();
    let webpack_path =
        environment === "production"
            ? "./config/webpack.prod.config.js"
            : "./config/webpack.dev.config.js"; // Use the watch-friendly webpack config in development.

    // Insert plugins.
    let webpack_config = require(webpack_path);
    webpack_config.plugins = webpack_config.plugins || [];
    webpack_config.plugins.push(
        new webpack.DefinePlugin({
            BROWSER_ENV: JSON.stringify(browser),
            BUILD_ENV: JSON.stringify(environment),
        })
    );

    if (environment === "development") {
        webpack_config.plugins.push({
            apply(compiler) {
                compiler.hooks.thisCompilation.tap("HotReloadStampPlugin", (compilation) => {
                    compilation.hooks.processAssets.tap(
                        {
                            name: "HotReloadStampPlugin",
                            stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
                        },
                        () => {
                            const source = `${JSON.stringify({ updatedAt: Date.now() })}\n`;
                            compilation.emitAsset(
                                "hot-reload.json",
                                new webpack.sources.RawSource(source)
                            );
                        }
                    );
                });
            },
        });
    }

    return gulp
        .src("./src/**/*.js", { base: "src" })
        .pipe(webpack_stream(webpack_config, webpack))
        .pipe(gulp.dest(output_dir))
        .on("error", (error) => log(error));
}

/**
 * A private task to build js files in a child process in development mode with watch mode of webpack
 *
 * Hint: The watch mode of webpack in development mode will block the current gulp task. So the buildJS task need to to be run independently in command line in another process
 *
 * @param {Function} done execute done to inform gulp that the task is finished
 */
function buildJSDev(done) {
    let result = spawn("gulp", ["buildJS", "--browser", browser, "--color"], {
        shell: true,
    });
    result.stdout.on("data", (data) => {
        log(data);
    });
    result.stderr.on("data", (data) => {
        log(data);
    });
    done();
}

/**
 * A private task to copy the browser manifest as the final manifest.json
 */
function copyManifest() {
    let output_dir = getOutputDir();
    return gulp
        .src(`./src/manifest_${browser}.json`)
        .pipe(
            through.obj(function (file, enc, cb) {
                const manifest = JSON.parse(file.contents.toString(enc));
                manifest.version = version;
                manifest.version_name = version;
                file.contents = Buffer.from(`${JSON.stringify(manifest, null, 4)}\n`);
                file.basename = "manifest.json";
                this.push(file);
                cb();
            })
        )
        .pipe(gulp.dest(output_dir));
}

/**
 * A private task to pack HTML files except HTML templates
 */
function html() {
    let output_dir = getOutputDir();
    return gulp.src(["./src/**/*.html"], { base: "src" }).pipe(gulp.dest(output_dir));
}

/**
 * A private task to convert styl to css files
 */
function styl() {
    let output_dir = getOutputDir();
    return gulp
        .src("./src/!(common)/**/*.styl", { base: "src" })
        .pipe(
            through
                .obj((file, enc, callback) => {
                    if (file.isNull()) return callback(null, file);
                    stylusCompiler(file.contents.toString(enc))
                        .set("filename", file.path)
                        .set("compress", true)
                        .render((error, css) => {
                            if (error) return callback(error);
                            file.contents = Buffer.from(css);
                            file.extname = ".css";
                            callback(null, file);
                        });
                })
                .on("error", (error) => log(error))
        )
        .pipe(gulp.dest(output_dir));
}

function pdfViewer(done) {
    syncPdfjsAssets({ outputDir: getOutputDir() });
    done();
}

function googleTranslateAssets(done) {
    syncGoogleTranslateAssets({ outputDir: getOutputDir() });
    done();
}

function ocrAssets(done) {
    syncOcrAssets({ outputDir: getOutputDir() });
    done();
}

/**
 * A private task to pack static files under "./static/"
 */
function packStatic() {
    let output_dir = getOutputDir();

    // Minify project-owned static JS. Vendored Google/PDF/OCR assets are generated separately.
    let staticJSFiles = gulp
        .src(
            [
                "./static/**/*.js",
                "!./static/ocr/**/*.js",
                "!./static/pdf/**/*.js",
                "!./static/pdf/lib/**/*.js",
                "!./static/pdf/viewer.js",
            ],
            {
                base: "static",
                since: gulp.lastRun(packStatic),
            }
        )
        .pipe(minifyStaticJS())
        .pipe(gulp.dest(output_dir));

    // Google page-translation bridge scripts are source code, but must be served
    // from /google so the page-context runtime can load them by extension URL.
    let googlePageTranslateScripts = gulp
        .src(`${GOOGLE_PAGE_TRANSLATE_SOURCE_DIR}/*.js`, {
            base: GOOGLE_PAGE_TRANSLATE_SOURCE_DIR,
            since: gulp.lastRun(packStatic),
        })
        .pipe(minifyStaticJS())
        .pipe(gulp.dest(`${output_dir}/google`));

    // non-js static files
    let staticOtherFiles = gulp
        .src(["./static/**/!(*.js)", "!./static/ocr/**/*", "!./static/pdf/**/*"], {
            base: "static",
        })
        .pipe(gulp.dest(output_dir));

    return mergeStream([staticJSFiles, staticOtherFiles, googlePageTranslateScripts]);
}
/**
 * End private tasks' definition
 */

function getOutputDir() {
    return environment === "development" ? `./dev/${browser}/` : `./build/${browser}/`;
}

function minifyStaticJS() {
    return environment === "development"
        ? through.obj()
        : terser().on("error", (error) => log(error));
}

// Write gulp and webpack output directly to stdout.
function log(d) {
    process.stdout.write(`${d}\n`);
}
