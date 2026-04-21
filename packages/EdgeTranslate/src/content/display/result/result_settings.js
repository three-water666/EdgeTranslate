function loadResultDisplaySettings(getOrSetDefaultSettings, defaultSettings, setters) {
    getOrSetDefaultSettings(
        ["LayoutSettings", "TranslateResultFilter", "ContentDisplayOrder"],
        defaultSettings
    ).then((result) => {
        applyResultDisplaySettings(
            normalizeResultDisplaySettings(result, defaultSettings),
            setters
        );
    });
}

function createStorageChangeHandler(setters) {
    return (changes, area) => {
        if (area !== "sync") return;
        if (changes.ContentDisplayOrder) {
            setters.setContentDisplayOrder(changes.ContentDisplayOrder.newValue);
        }
        if (changes.TranslateResultFilter) {
            applyTranslateResultFilter(changes.TranslateResultFilter.newValue, setters);
        }
        if (changes.LayoutSettings) {
            applyLayoutSettings(changes.LayoutSettings.newValue, setters);
        }
    };
}

function applyResultDisplaySettings(result, setters) {
    setters.setContentDisplayOrder(result.ContentDisplayOrder);
    applyTranslateResultFilter(result.TranslateResultFilter, setters);
    applyLayoutSettings(result.LayoutSettings, setters);
}

function normalizeResultDisplaySettings(result, defaultSettings) {
    return {
        LayoutSettings: normalizeLayoutSettings(result.LayoutSettings, defaultSettings),
        TranslateResultFilter: normalizeTranslateResultFilter(
            result.TranslateResultFilter,
            defaultSettings
        ),
        ContentDisplayOrder: normalizeContentDisplayOrder(
            result.ContentDisplayOrder,
            defaultSettings
        ),
    };
}

function normalizeLayoutSettings(layoutSettings, defaultSettings) {
    return {
        ...defaultSettings.LayoutSettings,
        ...(layoutSettings || {}),
    };
}

function normalizeTranslateResultFilter(filter, defaultSettings) {
    return {
        ...defaultSettings.TranslateResultFilter,
        ...(filter || {}),
    };
}

function normalizeContentDisplayOrder(contentDisplayOrder, defaultSettings) {
    if (!Array.isArray(contentDisplayOrder) || contentDisplayOrder.length === 0) {
        return defaultSettings.ContentDisplayOrder;
    }

    const allowedContents = new Set(defaultSettings.ContentDisplayOrder);
    const normalizedContentDisplayOrder = contentDisplayOrder.filter((content) =>
        allowedContents.has(content)
    );

    return normalizedContentDisplayOrder.length > 0
        ? normalizedContentDisplayOrder
        : defaultSettings.ContentDisplayOrder;
}

function applyTranslateResultFilter(filter, setters) {
    setters.setDisplaySPronunciation(filter["sPronunciation"]);
    setters.setDisplayTPronunciation(filter["tPronunciation"]);
    setters.setDisplaySPronunciationIcon(filter["sPronunciationIcon"]);
    setters.setDisplayTPronunciationIcon(filter["tPronunciationIcon"]);
    setters.setContentFilter(filter);
}

function applyLayoutSettings(layoutSettings, setters) {
    setters.setTextDirection(layoutSettings.RTL ? "rtl" : "ltr");
    setters.setFoldLongContent(layoutSettings.FoldLongContent);
}

export { createStorageChangeHandler, loadResultDisplaySettings };
