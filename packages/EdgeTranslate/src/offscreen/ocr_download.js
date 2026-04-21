function getOcrDownloadSource(language, remoteLangVersion) {
    return `https://cdn.jsdelivr.net/npm/@tesseract.js-data/${language}/${remoteLangVersion}/${language}.traineddata.gz`;
}

async function downloadAndCacheOcrLanguage({
    language,
    signal,
    remoteLangVersion,
    updateProgress,
    writeCache,
}) {
    const source = getOcrDownloadSource(language, remoteLangVersion);
    updateProgress(language, {
        status: "initializing tesseract",
        progress: 0,
    });

    const response = await fetch(source, { signal });
    if (!response.ok) {
        throw new Error(
            `Network error while fetching ${source}. Response code: ${response.status}`
        );
    }

    const contentLength = Number(response.headers.get("content-length")) || 0;
    const reader = response.body?.getReader();
    if (!reader) {
        const buffer = new Uint8Array(await response.arrayBuffer());
        await writeCache(language, buffer);
        return;
    }

    const merged = await readResponseChunks(reader, contentLength, signal, (progress) => {
        updateProgress(language, {
            status: "loading language traineddata",
            progress,
        });
    });

    updateProgress(language, {
        status: "initializing api",
        progress: 1,
    });

    await writeCache(language, merged);
}

async function readResponseChunks(reader, contentLength, signal, onProgress) {
    const chunks = [];
    let receivedLength = 0;

    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (signal.aborted) {
            throw new DOMException("The operation was aborted.", "AbortError");
        }

        chunks.push(value);
        receivedLength += value.length;

        if (contentLength > 0) {
            onProgress(receivedLength / contentLength);
        }
    }

    return mergeChunks(chunks, receivedLength);
}

function mergeChunks(chunks, totalLength) {
    const merged = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
    }

    return merged;
}

function classifyOcrDownloadError(errorText = "") {
    const normalizedText = String(errorText).toLowerCase();
    if (normalizedText.includes("aborterror") || normalizedText.includes("aborted")) {
        return "cancelled";
    }
    if (
        normalizedText.includes("network error") ||
        normalizedText.includes("failed to fetch") ||
        normalizedText.includes("networkerror") ||
        normalizedText.includes("load failed")
    ) {
        return "network";
    }
    if (normalizedText.includes("response code: 404")) {
        return "not_found";
    }
    if (normalizedText.includes("response code: 403")) {
        return "forbidden";
    }

    return "unknown";
}

export { classifyOcrDownloadError, downloadAndCacheOcrLanguage, getOcrDownloadSource };
