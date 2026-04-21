/** @jsx h */
import { h, Fragment } from "preact";
import { ThemeProvider } from "styled-components";
import Channel from "common/scripts/channel.js";
import { DEFAULT_SETTINGS, getOrSetDefaultSettings } from "common/scripts/settings.js";
import Notifier from "../library/notifier/notifier.js";
import { checkTimestamp } from "../panel/panel_shared.js";
import { useResultViewModel } from "./use_result_view_model.jsx";
import { ScreenshotNotice, ScreenshotNoticeAction, ScreenshotNoticeText } from "./result_styles.js";

// Communication channel.
const channel = new Channel();
const notifier = new Notifier("center");

/**
 * @param {{
 *   mainMeaning: string;
 *   originalText: string;
 *   tPronunciation?: string;
 *   sPronunciation?: string;
 *   detailedMeanings?: Array<{
 *     pos: string;
 *     meaning: string;
 *     synonyms?: Array<string>;
 *   }>;
 *   definitions?: Array<{
 *     pos: string;
 *     meaning: string;
 *     synonyms?: Array<string>;
 *     example?: string;
 *   }>;
 *   examples?: Array<{
 *     source?: string;
 *     target?: string;
 *   }>;
 * }} props translate result
 *
 * @returns {h.JSX.Element} element
 */
export default function Result(props) {
    const { contentDisplayOrder, contentFilter, contents, isScreenshotTranslate, textDirection } =
        useResultViewModel({
            channel,
            checkTimestamp,
            defaultSettings: DEFAULT_SETTINGS,
            getOrSetDefaultSettings,
            notifier,
            props,
            storage: chrome.storage,
        });

    return (
        <Fragment>
            <ThemeProvider theme={(props) => ({ ...props, textDirection })}>
                {contentDisplayOrder
                    .filter((content) => contentFilter[content])
                    .map((content) => contents[content])}
                {isScreenshotTranslate && (
                    <ScreenshotNotice>
                        <ScreenshotNoticeText>
                            {chrome.i18n.getMessage("ScreenshotTranslateResultNoticeTitle")}{" "}
                            {chrome.i18n.getMessage("ScreenshotTranslateResultNoticeText")}{" "}
                            <ScreenshotNoticeAction
                                type="button"
                                onClick={() => channel.emit("open_ocr_settings_page", {})}
                            >
                                {chrome.i18n.getMessage("ScreenshotTranslateResultNoticeAction")}
                            </ScreenshotNoticeAction>
                        </ScreenshotNoticeText>
                    </ScreenshotNotice>
                )}
            </ThemeProvider>
        </Fragment>
    );
}
