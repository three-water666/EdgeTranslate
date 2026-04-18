const sharedRules = require("../../eslint/shared-rules.js");

module.exports = {
    root: true,
    parser: "@babel/eslint-parser",
    parserOptions: {
        sourceType: "module",
        ecmaFeatures: {
            jsx: true,
        },
    },
    env: {
        node: true,
        browser: true,
        es6: true,
        jest: true,
    },
    extends: ["eslint:recommended", "preact", "prettier", "plugin:prettier/recommended"],
    globals: {
        document: false,
        window: false,
        chrome: false,
        browser: false,
        BROWSER_ENV: false,
        BUILD_ENV: false,
        driver: false,
        server: false,
    },
    plugins: ["html", "import", "prettier"],
    rules: {
        ...sharedRules,
        "no-multiple-empty-lines": [0, { max: 100 }],
    },
    overrides: [
        {
            files: ["test/**/*.{js,jsx}"],
            rules: {
                complexity: "off",
                "max-lines": "off",
                "max-lines-per-function": "off",
                "max-statements": "off",
            },
        },
    ],
};
