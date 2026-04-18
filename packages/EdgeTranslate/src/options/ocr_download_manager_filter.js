function filterOcrLanguageEntry({
    createDefaultState,
    language,
    languageStates,
    query,
    quickFilter,
    shouldHideLanguage,
    toDisplayName,
}) {
    return (
        !shouldHideLanguage(language) &&
        matchOcrLanguageQuickFilter(language, languageStates, quickFilter, createDefaultState) &&
        filterOcrLanguageByQuery(language, query, toDisplayName)
    );
}

function filterOcrLanguageByQuery(language, query, toDisplayName) {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return true;
    const displayName = toDisplayName(language).toLowerCase();
    const englishLabel = language.label.toLowerCase();
    const aliases = Array.isArray(language.aliases)
        ? language.aliases.map((item) => item.toLowerCase())
        : [];
    return (
        displayName.includes(normalizedQuery) ||
        englishLabel.includes(normalizedQuery) ||
        language.code.toLowerCase().includes(normalizedQuery) ||
        aliases.some((alias) => alias.includes(normalizedQuery))
    );
}

function matchOcrLanguageQuickFilter(language, languageStates, quickFilter, createDefaultState) {
    const state = languageStates[language.code] || createDefaultState();
    switch (quickFilter) {
        case "downloaded":
            return state.downloaded;
        case "enabled":
            return state.downloaded && state.enabled;
        case "not_downloaded":
            return !state.downloaded;
        default:
            return true;
    }
}

export { filterOcrLanguageEntry };
