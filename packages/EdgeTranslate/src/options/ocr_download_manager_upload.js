async function importOcrLanguageFile({
    applyEnabledLanguages,
    channel,
    getErrorText,
    getStoredOcrSettings,
    language,
    ocrLanguageStates,
    refreshLanguageState,
    render,
    setImportingState,
    toggleOcrLanguageEnabled,
    validateOcrLanguageFile,
    writeCachedOcrLanguage,
}) {
    const file = await waitForSelectedOcrFile();
    if (!file) return;

    return importSelectedOcrLanguageFile({
        applyEnabledLanguages,
        channel,
        file,
        getErrorText,
        getStoredOcrSettings,
        language,
        ocrLanguageStates,
        refreshLanguageState,
        render,
        setImportingState,
        toggleOcrLanguageEnabled,
        validateOcrLanguageFile,
        writeCachedOcrLanguage,
    });
}

async function importSelectedOcrLanguageFile({
    applyEnabledLanguages,
    channel,
    file,
    getErrorText,
    getStoredOcrSettings,
    language,
    ocrLanguageStates,
    refreshLanguageState,
    render,
    setImportingState,
    toggleOcrLanguageEnabled,
    validateOcrLanguageFile,
    writeCachedOcrLanguage,
}) {
    const state = ocrLanguageStates[language];
    if (!state) return;

    try {
        validateOcrLanguageFile(language, file);
        setImportingState(language, state);
        render();

        await persistImportedFile({
            applyEnabledLanguages,
            channel,
            file,
            getStoredOcrSettings,
            language,
            ocrLanguageStates,
            refreshLanguageState,
            toggleOcrLanguageEnabled,
            writeCachedOcrLanguage,
        });
        render();
    } catch (error) {
        applyImportErrorState(ocrLanguageStates, language, error, getErrorText);
        render();
    }
}

async function persistImportedFile({
    applyEnabledLanguages,
    channel,
    file,
    getStoredOcrSettings,
    language,
    ocrLanguageStates,
    refreshLanguageState,
    toggleOcrLanguageEnabled,
    writeCachedOcrLanguage,
}) {
    const buffer = new Uint8Array(await file.arrayBuffer());
    await writeCachedOcrLanguage(language, buffer);
    await refreshLanguageState(channel, language);
    await toggleOcrLanguageEnabled(language, true, { silent: true });

    const ocrSettings = await getStoredOcrSettings();
    applyEnabledLanguages(ocrLanguageStates, ocrSettings.EnabledLanguages);
    ocrLanguageStates[language] = {
        ...ocrLanguageStates[language],
        source: file.name,
    };
}

function applyImportErrorState(ocrLanguageStates, language, error, getErrorText) {
    ocrLanguageStates[language] = {
        ...ocrLanguageStates[language],
        downloading: false,
        status: "error",
        error: getErrorText(error),
        errorType: error?.type || "unknown",
    };
}

function waitForSelectedOcrFile() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".traineddata,.gz,application/octet-stream,application/gzip";
    return new Promise((resolve) => {
        input.onchange = () => resolve(input.files?.[0] || null);
        input.click();
    });
}

export { importOcrLanguageFile };
