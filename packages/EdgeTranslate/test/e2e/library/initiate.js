/**
 * Set source or target language types.
 * @param {
 *   source?: string;
 *   target?: string;
 *   mutual?: boolean; // Wether to open mutual translation mode.
 * } languageSetting
 */
export async function changeLanguageSetting(languageSetting) {
    await driver.navigate(driver.PAGES.POPUP);
    try {
        await driver.clickElement("#setting-switch");
    } catch (error) {
        const [url, title, bodyText] = await Promise.all([
            driver.getCurrentUrl(),
            driver.getTitle(),
            driver.executeScript("return document.body && document.body.innerText"),
        ]);
        throw new Error(
            `Failed to open popup settings. url=${url}, title=${title}, body=${bodyText}\n${error.stack}`
        );
    }
    if (languageSetting.source) {
        await driver.selectOption(await driver.findElement("#sl"), languageSetting.source);
    }
    if (languageSetting.target) {
        await driver.selectOption(await driver.findElement("#tl"), languageSetting.target);
    }
    if (languageSetting.mutual !== undefined) {
        const mutualTranslatorSwitch = await driver.findElement("#mutual-translate");
        if ((await mutualTranslatorSwitch.isEnabled()) === languageSetting.mutual) {
            await mutualTranslatorSwitch.click();
        }
    }
}
