const { promises: fs } = require("fs");
const { until, By } = require("selenium-webdriver");

/**
 * Temporary workaround to patch selenium's element handle API with methods
 * that match the playwright API for Elements
 * @param {Object} element - Selenium Element
 * @returns {Object} modified Selenium Element
 */
function wrapElementWithAPI(element, driver) {
    element.press = (key) => element.sendKeys(key);
    element.fill = async (input) => {
        // The 'fill' method in playwright replaces existing input
        await element.clear();
        await element.sendKeys(input);
    };
    element.waitForElementState = async (state, timeout) => {
        switch (state) {
            case "hidden":
                return await driver.wait(until.stalenessOf(element), timeout);
            case "visible":
                return await driver.wait(until.elementIsVisible(element), timeout);
            default:
                throw new Error(`Provided state: '${state}' is not supported`);
        }
    };
    return element;
}

/**
 * Wrap the selenium webdriver to enhance its capabilities.
 */
class Driver {
    /**
     * @param {!ThenableWebDriver} driver - A {@code WebDriver} instance
     * @param {string} browser - The type of browser this driver is controlling
     * @param {number} timeout
     */
    constructor(driver, browser, extensionUrl, timeout = 10000) {
        this.driver = driver;
        this.browser = browser;
        this.extensionUrl = extensionUrl;
        this.timeout = timeout;
        // The following values are found in
        // https://github.com/SeleniumHQ/selenium/blob/trunk/javascript/node/selenium-webdriver/lib/input.js#L50-L110
        // These should be replaced with string constants 'Enter' etc for playwright.
        this.Key = {
            BACK_SPACE: "\uE003",
            ENTER: "\uE007",
        };
        this.PAGES = {
            OPTIONS: "options/options",
            POPUP: "popup/popup",
        };
    }

    buildLocator(locator) {
        if (typeof locator === "string") {
            // If locator is a string we assume its a css selector
            return By.css(locator);
        } else if (locator.value) {
            // For backwards compatibility, checking if the locator has a value prop
            // tells us this is a Selenium locator
            return locator;
        } else if (locator.xpath) {
            // Providing an xpath prop to the object will consume the locator as an
            // xpath locator.
            return By.xpath(locator.xpath);
        }
        throw new Error(`The locator '${locator}' is not supported by the E2E test driver`);
    }

    async fill(rawLocator, input) {
        const element = await this.findElement(rawLocator);
        await element.fill(input);
        return element;
    }

    async press(rawLocator, keys) {
        const element = await this.findElement(rawLocator);
        await element.press(keys);
        return element;
    }

    async delay(time) {
        await new Promise((resolve) => setTimeout(resolve, time));
    }

    async wait(condition, timeout = this.timeout) {
        await this.driver.wait(condition, timeout);
    }

    async waitForSelector(rawLocator, { timeout = this.timeout, state = "visible" } = {}) {
        // Playwright has a waitForSelector method that will become a shallow
        // replacement for the implementation below. It takes an option options
        // bucket that can include the state attribute to wait for elements that
        // match the selector to be removed from the DOM.
        const selector = this.buildLocator(rawLocator);
        let element;
        if (!["visible", "detached"].includes(state)) {
            throw new Error(`Provided state selector ${state} is not supported`);
        }
        if (state === "visible") {
            element = await this.driver.wait(until.elementLocated(selector), timeout);
        } else if (state === "detached") {
            element = await this.driver.wait(
                until.stalenessOf(await this.findElement(selector)),
                timeout
            );
        }
        return wrapElementWithAPI(element, this);
    }

    async quit() {
        await this.driver.quit();
    }

    // Element interactions

    async findElement(rawLocator) {
        const locator = this.buildLocator(rawLocator);
        const element = await this.driver.wait(until.elementLocated(locator), this.timeout);
        return wrapElementWithAPI(element, this);
    }

    async findVisibleElement(rawLocator) {
        const locator = this.buildLocator(rawLocator);
        const element = await this.findElement(locator);
        await this.driver.wait(until.elementIsVisible(element), this.timeout);
        return wrapElementWithAPI(element, this);
    }

    async findClickableElement(rawLocator) {
        const locator = this.buildLocator(rawLocator);
        const element = await this.findElement(locator);
        await Promise.all([
            this.driver.wait(until.elementIsVisible(element), this.timeout),
            this.driver.wait(until.elementIsEnabled(element), this.timeout),
        ]);
        return wrapElementWithAPI(element, this);
    }

    async findElements(rawLocator) {
        const locator = this.buildLocator(rawLocator);
        const elements = await this.driver.wait(until.elementsLocated(locator), this.timeout);
        return elements.map((element) => wrapElementWithAPI(element, this));
    }

    /**
     * Get the result panel element.
     * @returns the result panel element
     */
    async getPanel() {
        const rootElement = await this.findElement("#edge-translate-root");
        const panelContainerEl = (await rootElement.findElements(By.css("div")))[0];
        if (!panelContainerEl) return undefined;

        const shadowRoot = await this.driver.executeScript(
            "return arguments[0].shadowRoot",
            panelContainerEl
        );
        if (!shadowRoot) return undefined;

        return (await shadowRoot.findElements(By.css("div")))[0];
    }

    async findClickableElements(rawLocator) {
        const locator = this.buildLocator(rawLocator);
        const elements = await this.findElements(locator);
        await Promise.all(
            elements.reduce((acc, element) => {
                acc.push(
                    this.driver.wait(until.elementIsVisible(element), this.timeout),
                    this.driver.wait(until.elementIsEnabled(element), this.timeout)
                );
                return acc;
            }, [])
        );
        return elements.map((element) => wrapElementWithAPI(element, this));
    }

    async clickElement(rawLocator) {
        const locator = this.buildLocator(rawLocator);
        const element = await this.findClickableElement(locator);
        await element.click();
    }

    /**
     * Select the text of an element.
     */
    async selectElement(rawLocator) {
        const element = await this.findElement(rawLocator);
        await this.driver.executeScript((element) => {
            function createMouseEvent(type, x, y, buttons) {
                return new MouseEvent(type, {
                    bubbles: true,
                    cancelable: true,
                    button: 0,
                    buttons,
                    clientX: x,
                    clientY: y,
                    screenX: x,
                    screenY: y,
                });
            }

            function selectElementText(element) {
                const textNodes = [];
                const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
                for (let node = walker.nextNode(); node; node = walker.nextNode()) {
                    if (node.textContent.length) textNodes.push(node);
                }
                if (!textNodes.length) return;

                const range = document.createRange();
                range.setStart(textNodes[0], 0);
                range.setEnd(
                    textNodes[textNodes.length - 1],
                    textNodes[textNodes.length - 1].textContent.length
                );

                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
            }

            const rect = element.getBoundingClientRect();
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height / 2;

            element.dispatchEvent(createMouseEvent("mousedown", x, y, 1));
            selectElementText(element);
            document.dispatchEvent(createMouseEvent("mousemove", x + 1, y, 1));
            document.dispatchEvent(createMouseEvent("mouseup", x + 1, y, 0));
        }, element);
    }

    /**
     * Select an option with a specified value from a given dropdown selection element.
     * @param {WebElement} selectEl a given dropdown selection element
     * @param {string} value a specified value
     */
    async selectOption(selectEl, value) {
        const optionEls = await selectEl.findElements(By.css("option"));
        return new Promise((resolve) => {
            optionEls.map((optionEl) => {
                optionEl.getAttribute("value").then((optionValue) => {
                    if (optionValue === value) {
                        optionEl.click();
                        return resolve();
                    }
                });
            });
        });
    }

    async clickPoint(rawLocator, x, y) {
        const locator = this.buildLocator(rawLocator);
        const element = await this.findElement(locator);
        await this.driver.actions().move({ origin: element, x, y }).click().perform();
    }

    async scrollToElement(element) {
        await this.driver.executeScript("arguments[0].scrollIntoView(true)", element);
    }

    // Navigation

    async navigate(page = Driver.PAGES.HOME) {
        return await this.driver.get(`${this.extensionUrl}/${page}.html`);
    }

    // Metrics

    async collectMetrics() {
        return await this.driver.executeScript(collectMetrics);
    }

    // Window management

    async openNewPage(url) {
        const newHandle = await this.driver.switchTo().newWindow();
        await this.driver.get(url);
        return newHandle;
    }

    /**
     *
     * @param {string | number} handle A handle string for a specified window or a number for the nth(or the last nth) of all windows.
     */
    async switchToWindow(handle) {
        let targetHandle;
        if (typeof handle === "number") {
            const handles = await this.driver.getAllWindowHandles();
            if (handle < 0) {
                targetHandle = handles[handles.length + handle];
            } else if (handle < handles.length) {
                targetHandle = handles[handle];
            } else throw new Error(`Can't locate the ${handle}th window.`);
        } else targetHandle = handle;
        await this.driver.switchTo().window(targetHandle);
    }

    async waitUntilXWindowHandles(x, delayStep = 1000, timeout = 5000) {
        let timeElapsed = 0;
        let windowHandles = [];
        while (timeElapsed <= timeout) {
            windowHandles = await this.driver.getAllWindowHandles();
            if (windowHandles.length === x) {
                return windowHandles;
            }
            await this.delay(delayStep);
            timeElapsed += delayStep;
        }
        throw new Error("waitUntilXWindowHandles timed out polling window handles");
    }

    async switchToWindowWithTitle(title, windowHandles) {
        // eslint-disable-next-line no-param-reassign
        windowHandles = windowHandles || (await this.driver.getAllWindowHandles());

        for (const handle of windowHandles) {
            await this.driver.switchTo().window(handle);
            const handleTitle = await this.driver.getTitle();
            if (handleTitle === title) {
                return handle;
            }
        }

        throw new Error(`No window with title: ${title}`);
    }

    /**
     * Closes all windows except those in the given list of exceptions
     * @param {Array<string>} exceptions - The list of window handle exceptions
     * @param {Array} [windowHandles] - The full list of window handles
     * @returns {Promise<void>}
     */
    async closeAllWindowHandlesExcept(exceptions, windowHandles) {
        // eslint-disable-next-line no-param-reassign
        windowHandles = windowHandles || (await this.driver.getAllWindowHandles());

        for (const handle of windowHandles) {
            if (!exceptions.includes(handle)) {
                await this.driver.switchTo().window(handle);
                await this.delay(1000);
                await this.driver.close();
                await this.delay(1000);
            }
        }
    }

    // Error handling

    async verboseReportOnFailure(title) {
        const artifactDir = `./test-artifacts/${this.browser}/${title}`;
        const filepathBase = `${artifactDir}/test-failure`;
        await fs.mkdir(artifactDir, { recursive: true });
        const screenshot = await this.driver.takeScreenshot();
        await fs.writeFile(`${filepathBase}-screenshot.png`, screenshot, {
            encoding: "base64",
        });
        const htmlSource = await this.driver.getPageSource();
        await fs.writeFile(`${filepathBase}-dom.html`, htmlSource);
        const uiState = await this.driver.executeScript(
            () => window.getCleanAppState && window.getCleanAppState()
        );
        await fs.writeFile(`${filepathBase}-state.json`, JSON.stringify(uiState, null, 2));
    }

    async checkBrowserForConsoleErrors() {
        const ignoredLogTypes = ["WARNING"];
        const ignoredErrorMessages = [
            // Third-party Favicon 404s show up as errors
            "favicon.ico - Failed to load resource: the server responded with a status of 404 (Not Found)",
        ];
        const browserLogs = await this.driver.manage().logs().get("browser");
        const errorEntries = browserLogs.filter(
            (entry) => !ignoredLogTypes.includes(entry.level.toString())
        );
        const errorObjects = errorEntries.map((entry) => entry.toJSON());
        return errorObjects.filter(
            (entry) => !ignoredErrorMessages.some((message) => entry.message.includes(message))
        );
    }

    /**
     * Proxy the selenium webdriver.
     * See node_modules/selenium-webdriver/lib/webdriver.js.
     */

    get(url) {
        return this.driver.get(url);
    }
    getTitle() {
        return this.driver.getTitle();
    }
    getCurrentUrl() {
        return this.driver.getCurrentUrl();
    }
    getWindowHandle() {
        return this.driver.getWindowHandle();
    }
    getAllWindowHandles() {
        return this.driver.getAllWindowHandles();
    }
    actions(options) {
        return this.driver.actions(options);
    }
    executeScript(script, ...args) {
        return this.driver.executeScript(script, ...args);
    }
    executeAsyncScript(script, ...args) {
        return this.driver.executeAsyncScript(script, ...args);
    }
    takeScreenshot() {
        return this.driver.takeScreenshot();
    }
    close() {
        return this.driver.close();
    }
}

function collectMetrics() {
    const results = {
        paint: {},
        navigation: [],
    };

    window.performance.getEntriesByType("paint").forEach((paintEntry) => {
        results.paint[paintEntry.name] = paintEntry.startTime;
    });

    window.performance.getEntriesByType("navigation").forEach((navigationEntry) => {
        results.navigation.push({
            domContentLoaded: navigationEntry.domContentLoadedEventEnd,
            load: navigationEntry.loadEventEnd,
            domInteractive: navigationEntry.domInteractive,
            redirectCount: navigationEntry.redirectCount,
            type: navigationEntry.type,
        });
    });

    return results;
}

module.exports = Driver;
