/** @type {import("jest").Config} */
module.exports = {
    verbose: true,
    testEnvironment: "jsdom",
    testRegex: "(/test/unit/.*\\.(test|spec))\\.(ts|tsx|js)$",
    testTimeout: 10000,
    transform: {
        "^.+\\.[t|j]sx?$": "babel-jest",
        "\\.(css|less)$": "./test/jest/rawAssetTransform.js",
    },
    moduleDirectories: ["node_modules", "src"],
    setupFilesAfterEnv: ["./test/unit/jest.setup.js"],
};
