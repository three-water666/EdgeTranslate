import { By } from "selenium-webdriver";

export function isVisualE2E() {
    return process.env.E2E_TEST_MODE === "visual";
}

export async function expectImageSnapshot(takeImage) {
    if (!isVisualE2E()) return;
    const image = typeof takeImage === "function" ? await takeImage() : await takeImage;
    expect(image).toMatchImageSnapshot();
}

export async function expectPanelContains(...expectedTextParts) {
    let panel;

    await driver.wait(async () => {
        try {
            panel = await findPanelNow();
            const panelText = await panel?.getText();
            return expectedTextParts.every((textPart) => panelText?.includes(textPart));
        } catch {
            return false;
        }
    });

    return panel;
}

export async function expectVisibleElement(locator) {
    const element = await driver.findElement(locator);
    expect(element).not.toBeUndefined();
    return element;
}

export async function withOption(selector, enabled, callback) {
    await driver.navigate(driver.PAGES.OPTIONS);
    const originalValue = await getOptionState(selector);
    await setOption(selector, enabled);

    try {
        await callback();
    } finally {
        await driver.navigate(driver.PAGES.OPTIONS);
        await setOption(selector, originalValue);
    }
}

export async function setOption(selector, enabled) {
    const option = await driver.findElement(selector);
    if ((await option.isSelected()) !== enabled) await toggleOption(selector);

    await driver.wait(async () => (await getOptionState(selector)) === enabled, 2000);
}

export async function toggleOption(selector) {
    await driver.clickElement(selector);
    await driver.delay(300);
}

async function getOptionState(selector) {
    return await (await driver.findElement(selector)).isSelected();
}

async function findPanelNow() {
    const panelContainer = await findPanelContainer();
    if (!panelContainer) return null;

    const shadowRoot = await driver.executeScript("return arguments[0].shadowRoot", panelContainer);
    if (!shadowRoot) return null;

    return (await shadowRoot.findElements(By.css("div")))[0];
}

async function findPanelContainer() {
    const rootElements = await driver.driver.findElements(By.css("#edge-translate-root"));
    const rootElement = rootElements[0];
    if (!rootElement) return null;

    const panelContainers = await rootElement.findElements(By.css("div"));
    return panelContainers[0] || null;
}
