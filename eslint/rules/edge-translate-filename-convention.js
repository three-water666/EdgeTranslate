"use strict";

const path = require("path");

const SNAKE_CASE = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;
const PASCAL_CASE = /^[A-Z][A-Za-z0-9]*$/;

function isLintableFile(filename) {
    return filename && filename !== "<input>" && [".js", ".jsx"].includes(path.extname(filename));
}

function getAllowedDescription(ext) {
    if (ext === ".jsx") return "PascalCase for components or snake_case for non-components";
    return "snake_case";
}

module.exports = {
    meta: {
        type: "problem",
        docs: {
            description: "enforce EdgeTranslate source file naming conventions",
        },
        schema: [],
    },
    create(context) {
        return {
            Program(node) {
                const filename = context.getFilename();
                if (!isLintableFile(filename)) return;

                const ext = path.extname(filename);
                const basename = path.basename(filename, ext);
                const valid =
                    ext === ".jsx"
                        ? PASCAL_CASE.test(basename) || SNAKE_CASE.test(basename)
                        : SNAKE_CASE.test(basename);

                if (valid) return;

                context.report({
                    node,
                    message: `Invalid source filename "{{name}}". Use ${getAllowedDescription(
                        ext
                    )}.`,
                    data: {
                        name: path.basename(filename),
                    },
                });
            },
        };
    },
};
