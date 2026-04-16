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
    rules: {
        complexity: ["error", 10],
        "import/no-cycle": "error",
        "max-depth": ["error", 4],
        "max-lines": ["error", { max: 300, skipBlankLines: true, skipComments: true }],
        "max-lines-per-function": ["error", { max: 80, skipBlankLines: true, skipComments: true }],
        "max-nested-callbacks": ["error", 3],
        "max-params": ["error", 4],
        "max-statements": ["error", 15],
        quotes: ["error", "double"],
        "prettier/prettier": ["error", { endOfLine: "lf" }],
    },
};
