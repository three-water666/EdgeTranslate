/**
 * module: common
 * part: none
 * function: encapsulate some async functions in Promise style
 */

export { delayPromise };

/**
 *
 * @param {number} time  the delay time. unit: ms
 * @returns {Promise<Object>} delay Promise
 */
function delayPromise(time) {
    return new Promise((resolve, reject) => {
        if (typeof time === "number" && time >= 0) {
            setTimeout(() => {
                resolve();
            }, time);
        } else {
            reject(`the type or value of variable time(${time}) is not supported`);
        }
    });
}

/**
 * wrap chrome.tabs functions to promise
 */
export class promiseTabs {
    /**
     * equal to chrome.tabs.create
     */
    static create(createProperties) {
        return chrome.tabs.create(createProperties);
    }

    /**
     * equal to chrome.tabs.query
     */
    static query(queryInfo) {
        return new Promise((resolve, reject) => {
            chrome.tabs
                .query(queryInfo)
                .then((tabs) => {
                    if (!tabs || !tabs[0] || tabs[0].id < 0) {
                        return reject({
                            error: "The query has no results",
                        });
                    }
                    return resolve(tabs);
                })
                .catch((err) => {
                    return reject({
                        error: err.message || "Unknown query error",
                    });
                });
        });
    }
}
