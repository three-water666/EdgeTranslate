function createOcrCacheApi({ dbName, storeName, cachePath }) {
    function getCacheKey(language) {
        return `${cachePath}/${language}.traineddata`;
    }

    function hasCachedLanguage(language) {
        return withStore("readonly", (store) => {
            return createRequestPromise(store.get(getCacheKey(language))).then(
                (value) => typeof value !== "undefined"
            );
        });
    }

    function writeCachedLanguage(language, data) {
        return withStore("readwrite", (store) => {
            store.put(data, getCacheKey(language));
            return createRequestPromise(store.transaction);
        });
    }

    function deleteCachedLanguage(language) {
        return withStore("readwrite", (store) => {
            store.delete(getCacheKey(language));
            return createRequestPromise(store.transaction);
        });
    }

    function withStore(mode, callback) {
        return openDb().then((db) =>
            callback(db.transaction(storeName, mode).objectStore(storeName))
        );
    }

    function openDb() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName);
            request.onupgradeneeded = () => {
                if (!request.result.objectStoreNames.contains(storeName)) {
                    request.result.createObjectStore(storeName);
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    return {
        deleteCachedLanguage,
        hasCachedLanguage,
        writeCachedLanguage,
    };
}

function createRequestPromise(request) {
    return new Promise((resolve, reject) => {
        request.oncomplete = request.onsuccess = () => resolve(request.result);
        request.onabort = request.onerror = () => reject(request.error);
    });
}

export { createOcrCacheApi };
