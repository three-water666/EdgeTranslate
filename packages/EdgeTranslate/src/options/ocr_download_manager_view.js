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
    appendOcrSourceMeta,
    formatOcrError,
    getDisplayName,
    getStatusText,
    language,
    onActions,
    state,
}) {
    const card = document.createElement("div");
    card.className = "ocr-download-card";

    card.appendChild(
        createOcrLanguageCardHeader({
            getDisplayName,
            getStatusText,
            language,
            onActions,
            state,
        })
    );
    card.appendChild(createOcrLanguageMeta(appendOcrSourceMeta, state));

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
    getStatusText,
    language,
    onActions,
    state,
}) {
    const row = document.createElement("div");
    row.className = "ocr-download-row";

    const title = document.createElement("span");
    title.className = "ocr-download-title";
    title.textContent = getDisplayName(language);
    row.appendChild(title);

    const status = document.createElement("span");
    status.className = "ocr-download-status";
    status.textContent = getStatusText(state);
    row.appendChild(status);

    row.appendChild(createOcrActionButtons(language.code, state, onActions));
    return row;
}

function createOcrActionButtons(languageCode, state, onActions) {
    const actions = document.createElement("div");
    actions.className = "ocr-download-actions";
    actions.appendChild(onActions.primary(languageCode, state));
    actions.appendChild(onActions.upload(languageCode, state));
    actions.appendChild(onActions.delete(languageCode, state));
    return actions;
}

function createOcrLanguageMeta(appendOcrSourceMeta, state) {
    const meta = document.createElement("div");
    meta.className = "ocr-download-meta";
    appendOcrSourceMeta(meta, state);
    return meta;
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
