function loadResultDisplaySettings(getOrSetDefaultSettings, defaultSettings, setters) {
    getOrSetDefaultSettings(
        ["LayoutSettings", "TranslateResultFilter", "ContentDisplayOrder"],
        defaultSettings
    ).then((result) => {
        applyResultDisplaySettings(result, setters);
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
