function captureOcrListRenderState(container) {
    const previousList = container.querySelector(".ocr-download-list");
    const activeElement = document.activeElement;
    const shouldRestoreSearchFocus = activeElement?.classList?.contains("ocr-search-input");

    return {
        previousListScrollTop: previousList ? previousList.scrollTop : 0,
        shouldRestoreSearchFocus,
        selectionStart: shouldRestoreSearchFocus ? activeElement.selectionStart : null,
        selectionEnd: shouldRestoreSearchFocus ? activeElement.selectionEnd : null,
    };
}

function restoreOcrListRenderState(container, list, previousState) {
    list.scrollTop = previousState.previousListScrollTop;

    if (!previousState.shouldRestoreSearchFocus) {
        return;
    }

    const nextSearchInput = container.querySelector(".ocr-search-input");
    if (!nextSearchInput) return;

    nextSearchInput.focus();
    if (
        typeof previousState.selectionStart === "number" &&
        typeof previousState.selectionEnd === "number" &&
        nextSearchInput.setSelectionRange
    ) {
        nextSearchInput.setSelectionRange(previousState.selectionStart, previousState.selectionEnd);
    }
}

function createOcrSearchInput({
    getMessageOrFallback,
    onApplyQuery,
    query,
    setComposing,
    setQuery,
}) {
    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.className = "ocr-search-input";
    searchInput.placeholder = getMessageOrFallback("OCRSearchPlaceholder", "搜索语言或代码");
    searchInput.value = query;
    searchInput.oncompositionstart = () => {
        setComposing(true);
    };
    searchInput.oncompositionend = (event) => {
        setComposing(false);
        window.setTimeout(() => {
            onApplyQuery(event.target.value || "", false);
        }, 0);
    };
    searchInput.oninput = (event) => {
        const nextQuery = event.target.value || "";
        setQuery(nextQuery);
        if (event.isComposing) return;
        onApplyQuery(nextQuery, true);
    };
    searchInput.onkeydown = (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        onApplyQuery(event.target.value || "", false);
    };
    return searchInput;
}

function createOcrFilterBar({ filter, getMessageOrFallback, onChangeFilter }) {
    const filterBar = document.createElement("div");
    filterBar.className = "ocr-filter-bar";
    [
        { key: "all", labelKey: "OCRFilterAll", fallback: "全部" },
        { key: "downloaded", labelKey: "OCRFilterDownloaded", fallback: "已下载" },
        { key: "enabled", labelKey: "OCRFilterEnabled", fallback: "已启用" },
        { key: "not_downloaded", labelKey: "OCRFilterNotDownloaded", fallback: "未下载" },
    ].forEach((item) => {
        const filterButton = document.createElement("button");
        filterButton.type = "button";
        filterButton.className = `ocr-filter-chip${filter === item.key ? " active" : ""}`;
        filterButton.textContent = getMessageOrFallback(item.labelKey, item.fallback);
        filterButton.onclick = () => onChangeFilter(item.key);
        filterBar.appendChild(filterButton);
    });
    return filterBar;
}

function createOcrErrorNode(errorText) {
    const errorNode = document.createElement("div");
    errorNode.className = "ocr-download-error";
    errorNode.textContent = errorText;
    return errorNode;
}

function createOcrLanguageCard({
    formatOcrError,
    getDisplayName,
    getEnabledStateText,
    getStatusText,
    language,
    onActions,
    state,
}) {
    const card = document.createElement("div");
    card.className = `ocr-download-card ${getOcrCardStateClass(state)}`;
    card.dataset.ocrLanguage = language.code;

    card.appendChild(
        createOcrLanguageCardHeader({
            getDisplayName,
            getEnabledStateText,
            getStatusText,
            language,
            onActions,
            state,
        })
    );

    if (state.downloading) {
        card.appendChild(createOcrProgressNode(state.progress));
    }

    if (state.error) {
        const inlineError = document.createElement("div");
        inlineError.className = "ocr-download-error inline";
        inlineError.textContent = formatOcrError(state);
        card.appendChild(inlineError);
    }

    return card;
}

function createOcrLanguageCardHeader({
    getDisplayName,
    getEnabledStateText,
    getStatusText,
    language,
    onActions,
    state,
}) {
    const row = document.createElement("div");
    row.className = "ocr-download-row";

    const title = document.createElement("span");
    title.className = "ocr-download-title";
    title.appendChild(createOcrLanguageName(getDisplayName(language)));
    row.appendChild(title);

    row.appendChild(createOcrStatusBadges({ getEnabledStateText, getStatusText, state }));

    row.appendChild(createOcrActionButtons(language.code, state, onActions));
    return row;
}

function createOcrLanguageName(displayName) {
    const name = document.createElement("span");
    name.className = "ocr-download-name";
    name.textContent = displayName;
    return name;
}

function createOcrStatusBadges({ getEnabledStateText, getStatusText, state }) {
    const status = document.createElement("span");
    status.className = "ocr-download-status";
    status.appendChild(createOcrStatusBadge(getDownloadStateClass(state), getStatusText(state)));

    if (state.downloaded && !state.downloading) {
        status.appendChild(createOcrStatusSeparator());
        status.appendChild(
            createOcrStatusBadge(state.enabled ? "enabled" : "disabled", getEnabledStateText(state))
        );
    }

    return status;
}

function createOcrStatusBadge(type, text) {
    const badge = document.createElement("span");
    badge.className = `ocr-status-badge ${type}`;
    badge.textContent = text;
    return badge;
}

function createOcrStatusSeparator() {
    const separator = document.createElement("span");
    separator.className = "ocr-status-separator";
    separator.textContent = "·";
    return separator;
}

function getDownloadStateClass(state) {
    if (state.downloading) return "downloading";
    if (state.error && !state.downloaded) return "error";
    return state.downloaded ? "downloaded" : "not-downloaded";
}

function getOcrCardStateClass(state) {
    if (state.error && !state.downloaded) return "error";
    if (state.downloading) return "downloading";
    if (state.enabled) return "enabled";
    if (state.downloaded) return "downloaded";
    return "not-downloaded";
}

function createOcrActionButtons(languageCode, state, onActions) {
    const actions = document.createElement("div");
    actions.className = "ocr-download-actions";
    actions.appendChild(withOcrAction(onActions.primary(languageCode, state), "primary"));
    actions.appendChild(withOcrAction(onActions.upload(languageCode, state), "upload"));
    actions.appendChild(withOcrAction(onActions.delete(languageCode, state), "delete"));
    return actions;
}

function withOcrAction(button, action) {
    button.dataset.ocrAction = action;
    return button;
}

function createOcrProgressNode(progressValue) {
    const progress = document.createElement("div");
    progress.className = "ocr-download-progress";
    progress.innerHTML = `<div class="ocr-download-progress-bar" style="width:${progressValue}%"></div>`;
    return progress;
}

export {
    captureOcrListRenderState,
    createOcrErrorNode,
    createOcrFilterBar,
    createOcrLanguageCard,
    createOcrSearchInput,
    restoreOcrListRenderState,
};
