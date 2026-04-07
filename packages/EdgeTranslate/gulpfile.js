const del = require("del");
const fs = require("fs");
const gulp = require("gulp");
const stylus = require("gulp-stylus");
const through = require("through2");
const webpack = require("webpack");
const webpack_stream = require("webpack-stream");
const zip = require("gulp-zip");
const terser = require("gulp-terser");
const eslint = require("gulp-eslint");
const mergeStream = require("merge-stream");
const minimist = require("minimist");
const spawn = require("child_process").spawn;

let args = minimist(process.argv.slice(2));
let browser = args.browser || "chrome";
let environment; // store the type of environment: enum{production,development}

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
    gulp.parallel(eslintJS, buildJSDev, copyManifest, html, styl, packStatic),
    watcher
);

/**
 * A public task to build a package in production mode
 */
exports.build = gulp.series(
    setProductEnvironment,
    clean,
    ensureOutputDirectory,
    gulp.parallel(eslintJS, buildJS, copyManifest, html, styl, packStatic)
);

/**
 * A public task to build and zip a package in production mode
 */
exports.pack = gulp.series(
    setProductEnvironment,
    clean,
    ensureOutputDirectory,
    gulp.parallel(eslintJS, buildJS, copyManifest, html, styl, packStatic),
    packToZip
);
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
    let output_dir = `./build/${browser}/`;
    let packageName = `edge_translate_${browser}.zip`;
    return del([output_dir, `./build/${packageName}`]);
}

function ensureOutputDirectory(done) {
    fs.mkdirSync(`./build/${browser}/`, { recursive: true });
    done();
}

/**
 * A private task to zip the built package
 */
function packToZip() {
    let match_dir = `./build/${browser}/**/*`;
    let packageName = `edge_translate_${browser}.zip`;
    return gulp.src(match_dir).pipe(zip(packageName)).pipe(gulp.dest("./build/"));
}

/**
 * A private task to watch change of code and update the package immediately
 * @param {Function} done execute done to inform gulp that the task is finished
 */
function watcher(done) {
    gulp.watch("./src/**/*.{js,jsx}").on("change", gulp.series(eslintJS));
    gulp.watch("./src/manifest_chrome.json").on("change", gulp.series(copyManifest));
    gulp.watch("./src/**/*.html").on("change", gulp.series(html));
    gulp.watch("./static/**/*").on("change", gulp.series(packStatic));
    gulp.watch("./src/**/*.styl").on("change", gulp.series(styl));
    done();
}

/**
 * A private task to run eslint check for JS code
 */
function eslintJS() {
    return gulp
        .src("./src/**/*.{js,jsx}", { base: "src" })
        .pipe(
            eslint({
                configFile: "./.eslintrc.js",
            })
        )
        .pipe(eslint.format());
}

/**
 * A private code to build JS code
 */
function buildJS() {
    let output_dir = `./build/${browser}/`;
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
    let output_dir = `./build/${browser}/`;
    return gulp
        .src(`./src/manifest_${browser}.json`)
        .pipe(
            through.obj(function (file, enc, cb) {
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
    let output_dir = `./build/${browser}/`;
    return gulp.src(["./src/**/*.html"], { base: "src" }).pipe(gulp.dest(output_dir));
}

/**
 * A private task to convert styl to css files
 */
function styl() {
    let output_dir = `./build/${browser}/`;
    return gulp
        .src("./src/!(common)/**/*.styl", { base: "src" })
        .pipe(
            stylus({
                compress: true, // Minify the generated CSS.
            }).on("error", (error) => log(error))
        )
        .pipe(gulp.dest(output_dir));
}

/**
 * A private task to pack static files under "./static/"
 */
function packStatic() {
    let output_dir = `./build/${browser}/`;

    // static JS files except google JS
    let staticJSFiles = gulp
        .src("./static/**/!(element_main).js", {
            base: "static",
            since: gulp.lastRun(packStatic),
        })
        .pipe(terser().on("error", (error) => log(error)))
        .pipe(gulp.dest(output_dir));

    // google page translation files
    // Do not uglify element_main.js
    let googleJS = gulp
        .src("./static/google/element_main.js", {
            base: "static",
            since: gulp.lastRun(packStatic),
        })
        .pipe(gulp.dest(output_dir));

    // non-js static files
    let staticOtherFiles = gulp
        .src("./static/**/!(*.js)", { base: "static" })
        .pipe(gulp.dest(output_dir));

    return mergeStream([staticJSFiles, googleJS, staticOtherFiles]);
}
/**
 * End private tasks' definition
 */

// Write gulp and webpack output directly to stdout.
function log(d) {
    process.stdout.write(`${d}\n`);
}
