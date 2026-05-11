async function importOcrLanguageFile({
    applyEnabledLanguages,
    channel,
    getErrorText,
    getMessageOrFallback,
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
    const shouldChooseFile = await showOcrUploadDialog({
        getMessageOrFallback,
        language,
        source: state?.source || "",
    });
    if (!shouldChooseFile) return;

    const file = await waitForSelectedOcrFile();
    if (!file) return;

    return importSelectedOcrLanguageFile({
        applyEnabledLanguages,
        channel,
        file,
        getErrorText,
        getMessageOrFallback,
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

function showOcrUploadDialog({ getMessageOrFallback, language, source }) {
    return new Promise((resolve) => {
        const dialog = createOcrUploadDialog({
            getMessageOrFallback,
            language,
            source,
            onCancel: () => close(false),
            onChooseFile: () => close(true),
        });

        function close(value) {
            document.removeEventListener("keydown", handleKeydown);
            dialog.remove();
            resolve(value);
        }

        function handleKeydown(event) {
            if (event.key === "Escape") close(false);
        }

        document.addEventListener("keydown", handleKeydown);
        document.body.appendChild(dialog);
        dialog.querySelector(".ocr-upload-dialog-choose")?.focus();
    });
}

function createOcrUploadDialog({ getMessageOrFallback, language, onCancel, onChooseFile, source }) {
    const overlay = createOcrUploadOverlay(onCancel);
    const dialog = createOcrUploadDialogPanel();
    overlay.appendChild(dialog);
    dialog.appendChild(
        createOcrUploadDialogText(
            "ocr-upload-dialog-title",
            getMessageOrFallback("OCRUploadDialogTitle", "上传 OCR 语言包")
        )
    );
    dialog.appendChild(
        createOcrUploadDialogText(
            "ocr-upload-dialog-description",
            getMessageOrFallback(
                "OCRUploadDialogDescription",
                "如果直接下载失败，可以打开下方默认下载地址手动获取语言包后上传。请使用对应语言的 traineddata 文件，文件名不匹配会被拦截。"
            )
        )
    );
    dialog.appendChild(createOcrUploadSourceNode({ getMessageOrFallback, language, source }));
    dialog.appendChild(
        createOcrUploadDialogActions({ getMessageOrFallback, onCancel, onChooseFile })
    );
    return overlay;
}

function createOcrUploadOverlay(onCancel) {
    const overlay = document.createElement("div");
    overlay.className = "ocr-upload-dialog-overlay";
    overlay.onclick = (event) => {
        if (event.target === overlay) onCancel();
    };
    return overlay;
}

function createOcrUploadDialogPanel() {
    const dialog = document.createElement("div");
    dialog.className = "ocr-upload-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    return dialog;
}

function createOcrUploadDialogText(className, text) {
    const node = document.createElement("div");
    node.className = className;
    node.textContent = text;
    return node;
}

function createOcrUploadDialogActions({ getMessageOrFallback, onCancel, onChooseFile }) {
    const actions = document.createElement("div");
    actions.className = "ocr-upload-dialog-actions";
    actions.appendChild(
        createOcrUploadDialogButton({
            className: "ocr-action-button secondary",
            onClick: onCancel,
            text: getMessageOrFallback("OCRUploadDialogCancel", "取消"),
        })
    );
    actions.appendChild(
        createOcrUploadDialogButton({
            className: "ocr-action-button ocr-upload-dialog-choose",
            onClick: onChooseFile,
            text: getMessageOrFallback("OCRUploadDialogChooseFile", "选择文件"),
        })
    );
    return actions;
}

function createOcrUploadDialogButton({ className, onClick, text }) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = text;
    button.onclick = onClick;
    return button;
}

function createOcrUploadSourceNode({ getMessageOrFallback, language, source }) {
    const sourceNode = document.createElement("div");
    sourceNode.className = "ocr-upload-dialog-source";
    sourceNode.appendChild(
        createOcrUploadDialogText(
            "ocr-upload-dialog-source-label",
            getMessageOrFallback("OCRUploadDialogSourceLabel", "默认下载地址")
        )
    );
    sourceNode.appendChild(createOcrUploadSourceValue({ getMessageOrFallback, language, source }));
    return sourceNode;
}

function createOcrUploadSourceValue({ getMessageOrFallback, language, source }) {
    if (source && /^https?:\/\//.test(source)) {
        return createOcrUploadSourceLink(source);
    }

    const value = document.createElement("span");
    value.textContent = getMessageOrFallback(
        "OCRUploadDialogSourceUnavailable",
        `暂时没有 ${language} 的默认下载地址`
    );
    return value;
}

function createOcrUploadSourceLink(source) {
    const link = document.createElement("a");
    link.className = "ocr-download-link";
    link.href = source;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = source;
    return link;
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
