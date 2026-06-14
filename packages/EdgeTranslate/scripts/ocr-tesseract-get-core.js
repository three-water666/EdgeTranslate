module.exports = async (lstmOnly, corePath, res) => {
    if (typeof global.TesseractCore !== "undefined") {
        return global.TesseractCore;
    }

    const statusText = "loading tesseract core";

    res.progress({ status: statusText, progress: 0 });

    if (!corePath) {
        throw new Error("OCR corePath is required.");
    }

    global.importScripts(corePath);

    if (
        typeof global.TesseractCore === "undefined" &&
        typeof global.TesseractCoreWASM !== "undefined" &&
        typeof WebAssembly === "object"
    ) {
        global.TesseractCore = global.TesseractCoreWASM;
    } else if (typeof global.TesseractCore === "undefined") {
        throw new Error("Failed to load TesseractCore");
    }

    global.TesseractCore = withExtensionWasmLocator(global.TesseractCore, corePath);

    res.progress({ status: statusText, progress: 1 });
    return global.TesseractCore;
};

function withExtensionWasmLocator(coreFactory, corePath) {
    const wasmPath = new URL("tesseract-core-lstm.wasm", corePath).href;

    return (options = {}) =>
        coreFactory({
            ...options,
            locateFile(fileName, scriptDirectory) {
                if (fileName === "tesseract-core-lstm.wasm") {
                    return wasmPath;
                }

                if (typeof options.locateFile === "function") {
                    return options.locateFile(fileName, scriptDirectory);
                }

                return new URL(fileName, scriptDirectory || corePath).href;
            },
        });
}
