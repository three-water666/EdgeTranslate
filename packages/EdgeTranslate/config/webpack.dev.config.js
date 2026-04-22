const path = require("path");
const { merge } = require("webpack-merge");
const baseWebpackConfig = require("./webpack.base.config.js");

module.exports = merge(baseWebpackConfig, {
    mode: "development",
    devtool: "inline-source-map",
    watch: true,
    resolve: {
        alias: {
            "@edge_translate/translators": path.resolve(
                __dirname,
                "../../translators/dev/translators.es.js"
            ),
        },
    },
});
