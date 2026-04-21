module.exports = {
    rootDir: "../../../",
    verbose: true,
    globalSetup: "<rootDir>/test/e2e/jest/global-setup.js",
    globalTeardown: "<rootDir>/test/e2e/jest/global-teardown.js",
    testEnvironment: "<rootDir>/test/e2e/jest/environment.js",
    setupFilesAfterEnv: ["<rootDir>/test/e2e/jest/jest-setup.js"],
    testRegex: "(/test/e2e/.*\\.(test|spec))\\.(ts|tsx|js)$",
    testTimeout: 100_000,
    transform: {
        "^.+\\.[t|j]sx?$": "babel-jest",
        "\\.(css|less)$": "<rootDir>/test/jest/rawAssetTransform.js",
    },
};
