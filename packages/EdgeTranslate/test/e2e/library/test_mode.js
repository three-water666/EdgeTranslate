import { By } from "selenium-webdriver";

export function isVisualE2E() {
    return process.env.E2E_TEST_MODE === "visual";
}

export async function expectImageSnapshot(imagePromise) {
    if (!isVisualE2E()) return;
    expect(await imagePromise).toMatchImageSnapshot();
}

export async function expectPanelContains(...expectedTextParts) {
    let panel;

    await driver.wait(async () => {
        panel = await findPanelNow();
        const panelText = await panel?.getText();
        return expectedTextParts.every((textPart) => panelText?.includes(textPart));
    });

    return panel;
}

export async function expectVisibleElement(locator) {
    const element = await driver.findElement(locator);
    expect(element).not.toBeUndefined();
    return element;
}

export async function toggleOption(selector) {
    await driver.clickElement(selector);
    await driver.delay(300);
}

async function findPanelNow() {
    const panelContainers = await driver.driver.findElements(By.xpath("/html/div[last()]"));
    const panelContainer = panelContainers[0];
    if (!panelContainer) return null;

    const shadowRoot = await driver.executeScript("return arguments[0].shadowRoot", panelContainer);
    if (!shadowRoot) return null;

    return (await shadowRoot.findElements(By.css("div")))[0];
}
