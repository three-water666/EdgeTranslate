const { expect } = require("@playwright/test");

async function expectPanelContains(page, ...expectedTextParts) {
    const panel = getPanel(page);
    await expect
        .poll(async () => {
            const panelText = await getPanelText(page);
            return expectedTextParts.every((textPart) => panelText.includes(textPart));
        })
        .toBe(true);
    await expectPanelInsideViewport(page, panel);

    return panel;
}

function getPanel(page) {
    return page.getByTestId("Head").locator("..");
}

async function expectVisualSnapshot(target, testInfo, name) {
    if (testInfo.project.name !== "visual") return;
    await expect(target).toHaveScreenshot(name);
}

async function expectPanelInsideViewport(page, panel) {
    await expect
        .poll(async () => {
            const boundingBox = await panel.boundingBox();
            const viewport = page.viewportSize();
            if (!boundingBox || !viewport) return false;

            return (
                boundingBox.x >= -1 &&
                boundingBox.y >= -1 &&
                boundingBox.x + boundingBox.width <= viewport.width + 1 &&
                boundingBox.y + boundingBox.height <= viewport.height + 1
            );
        })
        .toBe(true);
}

async function getPanelText(page) {
    return await page.evaluate(() => {
        const rootElement = document.querySelector("#edge-translate-root");
        const panelContainer = rootElement?.querySelector("div");
        return panelContainer?.shadowRoot?.textContent || "";
    });
}

async function hasPanel(page) {
    return await page.evaluate(() => {
        const rootElement = document.querySelector("#edge-translate-root");
        const panelContainer = rootElement?.querySelector("div");
        return Boolean(panelContainer?.shadowRoot?.querySelector("div"));
    });
}

async function withOption(page, extensionUrl, selector, callback) {
    await openOptionsPage(page, extensionUrl);
    const originalValue = await page.locator(selector).isChecked();
    await setOption(page, extensionUrl, selector, true);

    try {
        await callback();
    } finally {
        await setOption(page, extensionUrl, selector, originalValue);
    }
}

async function setOption(page, extensionUrl, selector, enabled) {
    await openOptionsPage(page, extensionUrl);
    const option = page.locator(selector);
    await option.setChecked(enabled);

    if (enabled) await expect(option).toBeChecked();
    else await expect(option).not.toBeChecked();

    await page.waitForTimeout(300);
}

async function openOptionsPage(page, extensionUrl, hash = "") {
    await page.goto(`${extensionUrl}/options/options.html${hash}`);
}

async function selectElementText(page, selector) {
    await page.evaluate((targetSelector) => {
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

        const element = document.querySelector(targetSelector);
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

        const rect = element.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        element.dispatchEvent(createMouseEvent("mousedown", x, y, 1));
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        document.dispatchEvent(createMouseEvent("mousemove", x + 1, y, 1));
        document.dispatchEvent(createMouseEvent("mouseup", x + 1, y, 0));
    }, selector);
}

async function expectNewPageWithUrl(context, previousPages, urlPart) {
    await expect
        .poll(() => {
            return context
                .pages()
                .filter((page) => !previousPages.has(page))
                .some((page) => page.url().includes(urlPart));
        })
        .toBe(true);
}

module.exports = {
    expectNewPageWithUrl,
    expectPanelContains,
    expectVisualSnapshot,
    getPanel,
    getPanelText,
    hasPanel,
    openOptionsPage,
    selectElementText,
    setOption,
    withOption,
};
