const {
    buildExtension,
    devExtension,
    packageExtension,
    parseArgs,
    printUsage,
} = require("./build-extension-tasks");

async function main() {
    const args = parseArgs(process.argv.slice(2));

    if (args.command === "build") {
        await buildExtension(args);
        return;
    }

    if (args.command === "dev") {
        await devExtension(args);
        return;
    }

    if (args.command === "package") {
        await packageExtension(args);
        return;
    }

    printUsage();
    process.exit(1);
}

main().catch((error) => {
    console.error(error.stack || error);
    process.exit(1);
});
