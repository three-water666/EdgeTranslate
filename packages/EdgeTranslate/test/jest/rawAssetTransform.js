const path = require("path");

module.exports = {
    process(src) {
        return {
            code: `module.exports = ${JSON.stringify(src)};`,
            map: null,
        };
    },
    getCacheKey(src, filename) {
        return `${path.basename(filename)}:${src}`;
    },
};
