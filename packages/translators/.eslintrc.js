const sharedRules = require("../../eslint/shared-rules.js");

module.exports = {
    root: true,
    parser: "@typescript-eslint/parser",
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
    },
    env: {
        node: true,
        es6: true,
        jest: true,
    },
    plugins: ["@typescript-eslint", "import", "prettier"],
    extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier"],
    rules: sharedRules,
    overrides: [
        {
            files: ["*.js", "*.setup.js"],
            rules: {
                "@typescript-eslint/no-var-requires": "off",
            },
        },
        {
            files: ["src/translators/*.ts", "packages/translators/src/translators/*.ts"],
            rules: {
                complexity: "off",
                "max-depth": "off",
                "max-lines": "off",
                "max-statements": "off",
                "prefer-const": "off",
                "no-empty": "off",
            },
        },
    ],
};
