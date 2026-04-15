import { getDomain } from "common/scripts/common.js";
import { isPDFjsPDFViewer, isNativePDFViewer, detectSelect } from "../common.js";
import Channel from "common/scripts/channel.js";
import { DEFAULT_SETTINGS, getOrSetDefaultSettings } from "common/scripts/settings.js";

if (!isNativePDFViewer()) {
    initSelectTranslate();
}

function initSelectTranslate() {
    const LONG_PRESS_DURATION = 450;
    const LONG_PRESS_PREVIEW_DELAY = 140;
    const LONG_PRESS_MOVE_THRESHOLD = 8;
    const LONG_PRESS_HIGHLIGHT_ID = "edge-translate-long-press-highlight";
    const SENTENCE_BOUNDARY_REGEXP = /[.!?。！？；;\n]/;
    const SENTENCE_TRAILING_REGEXP = /[\s"'\])）】〕〉》」』]+/;
    const CHUNK_TARGET_LENGTH = 90;
    const CHUNK_MAX_LENGTH = 160;
    const CHUNK_MIN_LENGTH = 24;
    const BLOCK_TEXT_MAX_LENGTH = 1200;
    const BLOCK_TEXT_MIN_LENGTH = 8;
    const ImageData =
        "data:image/png;base64,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";

    // Communication channel.
    const channel = new Channel();

    // to indicate whether the translation button has been shown
    let HasButtonShown = false;
    let screenshotSelectionSession = null;
    let longPressSession = null;
    let LongPressEnabled = false;
    let longPressHighlightContainer = null;

    /**
     * Initiate translation button.
     */
    let translationButtonContainer = document.createElement("iframe");
    const iframeContainer = translationButtonContainer;
    // Note: some websites can't get contentDocument e.g. https://raw.githubusercontent.com/git/git/master/Documentation/RelNotes/2.40.0.txt. So I use shadow DOM as a fallback.
    document.documentElement.appendChild(translationButtonContainer);
    if (translationButtonContainer.contentDocument === null) {
        translationButtonContainer = document.createElement("div");
        renderButton();
    }
    document.documentElement.removeChild(iframeContainer);
    translationButtonContainer.id = "edge-translate-button";
    translationButtonContainer.style.backgroundColor = "white"; // programatically set style to compatible with the extension 'Dark Reader'

    /**
     * When the user clicks the translation button, the translationButtonContainer will be mounted at document.documentElement and the load event will be triggered.
     */
    function renderButton() {
        const buttonImage = document.createElement("img");
        buttonImage.src = ImageData;
        const BUTTON_SIZE = "20px";
        Object.assign(buttonImage.style, {
            width: BUTTON_SIZE,
            height: BUTTON_SIZE,
            minWidth: 0,
            maxWidth: BUTTON_SIZE,
            minHeight: 0,
            maxHeight: BUTTON_SIZE,
            padding: 0,
            border: 0,
            margin: 0,
            verticalAlign: 0, // fix the style problem in some websites
            filter: "none", // https://github.com/EdgeTranslate/EdgeTranslate/projects/2#card-58817626
        });
        const translationButton = document.createElement("div");
        Object.assign(translationButton.style, {
            width: BUTTON_SIZE,
            height: BUTTON_SIZE,
            padding: "6px",
            margin: 0,
            borderRadius: "50%",
            boxSizing: "content-box",
            overflow: "hidden",
            border: "none",
            cursor: "pointer",
        });
        translationButton.appendChild(buttonImage);
        getInnerParent(translationButtonContainer).appendChild(translationButton);

        const CleanStyle = {
            padding: 0,
            margin: 0,
            border: "none",
            overflow: "hidden",
        };
        Object.assign(
            translationButtonContainer.contentDocument?.documentElement.style || {},
            CleanStyle
        );
        Object.assign(translationButtonContainer.contentDocument?.body.style || {}, CleanStyle);
        translationButton.addEventListener("mousedown", buttonClickHandler);
        translationButton.addEventListener("contextmenu", (e) => e.preventDefault());
    }
    translationButtonContainer.addEventListener("load", renderButton);

    let originScrollX = 0; // record the original scroll X position(before scroll event)
    let originScrollY = 0; // record the original scroll Y position(before scroll event)
    let originPositionX = 0; // record the original X position of selection icon(before scroll event)
    let originPositionY = 0; // record the original Y position of selection icon(before scroll event)
    let scrollingElement = window; // store the specific scrolling element. In normal web pages, window is the scrolling object, while in pdf.js viewer, "#viewerContainer" is the scrolling element.
    // store the name of scroll property according to scrollingElement(pageXOffset for window and scrollLeft for pdf.js element)
    let scrollPropertyX = "pageXOffset";
    let scrollPropertyY = "pageYOffset";
    // store the position setting of the translation button. default: "TopLeft"
    let ButtonPositionSetting = "TopRight";

    // Fetch the button position setting.
    getOrSetDefaultSettings("LayoutSettings", DEFAULT_SETTINGS).then((result) => {
        ButtonPositionSetting = result.LayoutSettings.SelectTranslatePosition;
    });
    getOrSetDefaultSettings("OtherSettings", DEFAULT_SETTINGS).then((result) => {
        LongPressEnabled = Boolean(result.OtherSettings?.TranslateAfterLongPress);
    });
    // Update the button position setting when the setting is changed.
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "sync") return;
        if (changes.LayoutSettings) {
            ButtonPositionSetting = changes.LayoutSettings.newValue.SelectTranslatePosition;
        }
        if (changes.OtherSettings) {
            LongPressEnabled = Boolean(changes.OtherSettings.newValue?.TranslateAfterLongPress);
            if (!LongPressEnabled) cancelLongPressSession();
        }
    });

    // this listener activated when document content is loaded
    // to make selection button available ASAP
    window.addEventListener("DOMContentLoaded", () => {
        // the scrolling elements in pdf files are different from normal web pages
        if (isPDFjsPDFViewer()) {
            // #viewerContainer element is the scrolling element in a pdf file
            scrollingElement = document.getElementById("viewerContainer");
            scrollPropertyX = "scrollLeft";
            scrollPropertyY = "scrollTop";
        }
        // to make the selection icon move with the mouse scrolling
        scrollingElement.addEventListener("scroll", scrollHandler);

        document.addEventListener("mousedown", () => {
            disappearButton();
            // whether user take a select action
            detectSelect(document, (event) => {
                selectTranslate(event);
            });
        });
        document.addEventListener("mousedown", longPressStartHandler, true);
        document.addEventListener("mousemove", longPressMoveHandler, true);
        document.addEventListener("mouseup", longPressEndHandler, true);
        document.addEventListener("dragstart", cancelLongPressSession, true);
        window.addEventListener("blur", cancelLongPressSession);

        document.addEventListener("dblclick", (event) => {
            selectTranslate(event, true);
        });

        document.addEventListener("click", (event) => {
            // triple click
            if (event.detail === 3) {
                selectTranslate(event, true);
            }
        });

        /**
         * implement the select translate feature
         * for the implement detail, please check in the document
         * @param {MouseEvent} event mouse event of mouse up , double click or triple click
         * @param {boolean} isDoubleClick whether the event type is double click or triple click, set false by default
         */
        const selectTranslate = async (event, isDoubleClick = false) => {
            if (!shouldTranslate()) return;

            const inBlacklist = await isInBlacklist();
            if (inBlacklist) return;

            getOrSetDefaultSettings("OtherSettings", DEFAULT_SETTINGS).then((result) => {
                if (!result.OtherSettings) return;

                let OtherSettings = result.OtherSettings;

                // Show translating result instantly.
                if (
                    OtherSettings["TranslateAfterSelect"] ||
                    (isDoubleClick && OtherSettings["TranslateAfterDblClick"])
                ) {
                    translateSubmit();
                } else if (OtherSettings["SelectTranslate"]) {
                    showButton(event);
                }
            });
        };
    });

    /**
     * 处理鼠标点击按钮事件
     *
     * @param {MouseEvent} event 鼠标点击事件
     */
    function buttonClickHandler(event) {
        event.preventDefault();
        event.stopPropagation();
        if (event.button === 0) {
            translateSubmit();
        } else if (event.button === 2) {
            pronounceSubmit();
        }
    }

    /**
     * Use this function to show the translation buttion.
     */
    function showButton(event) {
        document.documentElement.appendChild(translationButtonContainer);

        const OffsetXValue = 10,
            OffsetYValue = 20;
        let XBias, YBias;
        switch (ButtonPositionSetting) {
            default:
            case "TopRight":
                XBias = OffsetXValue;
                YBias = -OffsetYValue - translationButtonContainer.clientHeight;
                break;
            case "TopLeft":
                XBias = -OffsetXValue - translationButtonContainer.clientWidth;
                YBias = -OffsetYValue - translationButtonContainer.clientHeight;
                break;
            case "BottomRight":
                XBias = OffsetXValue;
                YBias = OffsetYValue;
                break;
            case "BottomLeft":
                XBias = -OffsetXValue - translationButtonContainer.clientWidth;
                YBias = OffsetYValue;
                break;
        }

        let XPosition = event.x + XBias;
        let YPosition = event.y + YBias;

        // If the icon is beyond the side of the page, we need to reposition the icon inside the page.
        if (
            XPosition <= 0 ||
            XPosition + translationButtonContainer.clientWidth > window.innerWidth
        )
            XPosition = event.x - XBias - translationButtonContainer.clientWidth;
        if (
            YPosition <= 0 ||
            YPosition + translationButtonContainer.clientHeight > window.innerHeight
        )
            YPosition = event.y - YBias - translationButtonContainer.clientHeight;

        // set the new position of the icon
        translationButtonContainer.style.top = `${YPosition}px`;
        translationButtonContainer.style.left = `${XPosition}px`;

        // record original position of the selection icon and the start mouse scrolling position
        originScrollX = scrollingElement[scrollPropertyX];
        originScrollY = scrollingElement[scrollPropertyY];
        originPositionX = XPosition;
        originPositionY = YPosition;
        HasButtonShown = true;
    }

    /**
     * get selected text and its position in the page
     *
     * @returns {Object} format: {text: "string", position: [p1,p2]}
     */
    function getSelection() {
        let selection = window.getSelection();
        let text = "";
        let position;
        if (selection.rangeCount > 0) {
            text = selection.toString().trim();
            if (isPDFjsPDFViewer()) {
                /**
                 * pdf.js adds \n at the end of every line and breaks down single sentences into multiple lines.
                 * Thus we have to replace \n with space to improve translation.
                 */
                text = text.replace(/\n/g, " ");
            }

            const lastRange = selection.getRangeAt(selection.rangeCount - 1);
            // If the user selects something in a shadow dom, the endContainer will be the HTML element and the position will be [0,0]. In this situation, we set the position undefined to avoid relocating the result panel.
            if (lastRange.endContainer !== document.documentElement) {
                let rect = selection.getRangeAt(selection.rangeCount - 1).getBoundingClientRect();
                position = [rect.left, rect.top];
            }
        }
        return { text, position };
    }

    /**
     * 处理点击翻译按钮后的事件
     */
    function translateSubmit() {
        let selection = getSelection();
        if (selection.text && selection.text.length > 0) {
            channel.request("translate", selection).then(() => {
                getOrSetDefaultSettings("OtherSettings", DEFAULT_SETTINGS).then((result) => {
                    // to check whether user need to cancel text selection after translation finished
                    if (result.OtherSettings && result.OtherSettings["CancelTextSelection"]) {
                        cancelTextSelection();
                    }
                });
                disappearButton();
            });
        }
    }

    function longPressStartHandler(event) {
        if (!LongPressEnabled) return;
        if (
            event.button !== 0 ||
            event.ctrlKey ||
            event.metaKey ||
            event.altKey ||
            event.shiftKey
        ) {
            cancelLongPressSession();
            return;
        }

        if (shouldIgnoreLongPressTarget(event.target)) {
            cancelLongPressSession();
            return;
        }

        longPressSession = {
            startX: event.clientX,
            startY: event.clientY,
            startedAt: Date.now(),
            moved: false,
            triggered: false,
            previewRange: null,
            previewTimer: window.setTimeout(() => {
                if (!longPressSession || longPressSession.moved) return;
                longPressSession.previewRange = getLongPressRangeFromPoint(
                    longPressSession.startX,
                    longPressSession.startY
                );
                renderLongPressHighlight(longPressSession.previewRange);
            }, LONG_PRESS_PREVIEW_DELAY),
            translateTimer: window.setTimeout(async () => {
                if (!longPressSession || longPressSession.moved || longPressSession.triggered)
                    return;
                await triggerLongPressTranslate(longPressSession);
            }, LONG_PRESS_DURATION),
        };
    }

    function longPressMoveHandler(event) {
        if (!longPressSession) return;

        if (
            Math.abs(event.clientX - longPressSession.startX) > LONG_PRESS_MOVE_THRESHOLD ||
            Math.abs(event.clientY - longPressSession.startY) > LONG_PRESS_MOVE_THRESHOLD
        ) {
            longPressSession.moved = true;
            clearLongPressHighlight();
        }
    }

    async function longPressEndHandler(event) {
        const session = longPressSession;
        cancelLongPressSession();

        if (!session || event.button !== 0) return;
    }

    function cancelLongPressSession() {
        if (longPressSession?.previewTimer) {
            window.clearTimeout(longPressSession.previewTimer);
        }
        if (longPressSession?.translateTimer) {
            window.clearTimeout(longPressSession.translateTimer);
        }
        clearLongPressHighlight();
        longPressSession = null;
    }

    async function triggerLongPressTranslate(session) {
        if (!LongPressEnabled || window.getSelection().toString().trim()) return;

        const inBlacklist = await isInBlacklist();
        if (inBlacklist) return;

        if (
            !selectTextAtPoint(session.startX, session.startY, session.previewRange) ||
            !shouldTranslate()
        ) {
            return;
        }

        session.triggered = true;
        clearLongPressHighlight();
        translateSubmit();
    }

    /**
     * Check if we should start translating.
     *
     * @returns {boolean} if we should start translating
     */
    function shouldTranslate() {
        let selectionObject = window.getSelection();
        let selectionText = selectionObject.toString().trim();

        /**
         * Filter out the nodes to avoid the translation button appearing in some unnecessary places.
         * @param {Node} node the node to be filtered
         * @returns {boolean} if the node should be passed
         */
        const filterNode = (node) => {
            if (node.nodeType === Node.TEXT_NODE) return true;
            // BODY is a special case. see https://github.com/EdgeTranslate/EdgeTranslate/issues/531
            if (node.nodeType === Node.ELEMENT_NODE) return ["BODY"].includes(node.tagName);
        };

        return (
            selectionText.length > 0 &&
            (filterNode(selectionObject.anchorNode) || filterNode(selectionObject.focusNode)) &&
            // Do not re-translate translated text.
            !(window.isDisplayingResult && window.translateResult.originalText === selectionText)
        );
    }

    function selectTextAtPoint(x, y, existingRange) {
        const range = existingRange?.cloneRange() || getLongPressRangeFromPoint(x, y);
        if (!range || range.collapsed) return false;

        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        return selection.toString().trim().length > 0;
    }

    function getLongPressRangeFromPoint(x, y) {
        const blockRange = getBlockRangeFromPoint(x, y);
        if (blockRange) {
            return blockRange;
        }

        const nativeRange = getNativeParagraphRangeFromPoint(x, y);
        if (nativeRange && isReasonableLongPressRange(nativeRange, x, y)) {
            return nativeRange;
        }

        return getChunkRangeFromPoint(x, y);
    }

    function getBlockRangeFromPoint(x, y) {
        const caretRange = getCaretRangeFromPoint(x, y);
        if (!caretRange) return null;

        const textNode =
            caretRange.startContainer.nodeType === Node.TEXT_NODE
                ? caretRange.startContainer
                : getNearestTextNode(caretRange.startContainer, x, y, caretRange.startOffset);
        if (!textNode || !textNode.textContent?.trim()) return null;

        const container = getPreferredBlockContainer(textNode, x, y);
        const textNodes = collectTextNodes(container);
        if (!textNodes.length) return null;

        const range = document.createRange();
        range.setStart(textNodes[0], 0);
        range.setEnd(
            textNodes[textNodes.length - 1],
            textNodes[textNodes.length - 1].textContent.length
        );

        return range.toString().trim() ? range : null;
    }

    function getPreferredBlockContainer(textNode, x, y) {
        const fallbackContainer = getSentenceContainer(textNode);
        let currentElement = textNode.parentElement;
        let bestContainer = fallbackContainer;
        let bestScore = getBlockContainerScore(fallbackContainer, x, y);

        while (
            currentElement &&
            currentElement !== document.body &&
            currentElement !== document.documentElement
        ) {
            if (!isBlockContainerCandidate(currentElement)) {
                currentElement = currentElement.parentElement;
                continue;
            }

            const score = getBlockContainerScore(currentElement, x, y);
            if (score > bestScore) {
                bestContainer = currentElement;
                bestScore = score;
            }

            currentElement = currentElement.parentElement;
        }

        return bestContainer;
    }

    function isBlockContainerCandidate(element) {
        const display = window.getComputedStyle(element).display;
        return (
            /^(P|DIV|LI|TD|TH|BLOCKQUOTE|ARTICLE|SECTION|MAIN|ASIDE|PRE|H[1-6])$/.test(
                element.tagName
            ) || ["block", "list-item", "table-cell"].includes(display)
        );
    }

    function getBlockContainerScore(element, x, y) {
        if (!element || shouldIgnoreLongPressTarget(element)) return -1;

        const rect = element.getBoundingClientRect();
        if (!rect.width || !rect.height) return -1;
        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return -1;

        const textLength = getBlockTextLength(element);
        if (!isReasonableBlockContainer(element)) return -1;

        let score = textLength;
        if (/^(P|LI|BLOCKQUOTE|ARTICLE|SECTION|MAIN|ASIDE|PRE)$/.test(element.tagName)) {
            score += 120;
        }
        if (element.childElementCount > 0) {
            score += Math.min(element.childElementCount, 6) * 10;
        }

        return score;
    }

    function isReasonableBlockContainer(element) {
        const textLength = getBlockTextLength(element);
        return textLength >= BLOCK_TEXT_MIN_LENGTH && textLength <= BLOCK_TEXT_MAX_LENGTH;
    }

    function getBlockTextLength(element) {
        const textNodes = collectTextNodes(element);
        if (!textNodes.length) return 0;
        return textNodes.reduce((total, node) => total + (node.textContent || "").trim().length, 0);
    }

    function getChunkRangeFromPoint(x, y) {
        const caretRange = getCaretRangeFromPoint(x, y);
        if (!caretRange) return null;

        const textNode =
            caretRange.startContainer.nodeType === Node.TEXT_NODE
                ? caretRange.startContainer
                : getNearestTextNode(caretRange.startContainer, x, y, caretRange.startOffset);
        if (!textNode || !textNode.textContent?.trim()) return null;

        const chunkContext = getChunkContext(textNode, caretRange.startOffset);
        if (!chunkContext) return null;

        const range = document.createRange();
        range.setStart(chunkContext.start.node, chunkContext.start.offset);
        range.setEnd(chunkContext.end.node, chunkContext.end.offset);
        return range;
    }

    function getNativeParagraphRangeFromPoint(x, y) {
        const caretRange = getCaretRangeFromPoint(x, y);
        if (
            !caretRange ||
            !window.getSelection ||
            typeof window.getSelection().modify !== "function"
        ) {
            return null;
        }

        const selection = window.getSelection();
        const previousRanges = [];
        for (let i = 0; i < selection.rangeCount; i++) {
            previousRanges.push(selection.getRangeAt(i).cloneRange());
        }

        try {
            selection.removeAllRanges();
            const collapsedRange = caretRange.cloneRange();
            collapsedRange.collapse(true);
            selection.addRange(collapsedRange);

            selection.modify("move", "backward", "paragraphboundary");
            selection.modify("extend", "forward", "paragraphboundary");

            if (!selection.rangeCount) return null;
            const result = selection.getRangeAt(0).cloneRange();
            return result.collapsed ? null : result;
        } catch (error) {
            return null;
        } finally {
            selection.removeAllRanges();
            previousRanges.forEach((range) => selection.addRange(range));
        }
    }

    function isReasonableLongPressRange(range, x, y) {
        const text = range.toString().trim();
        if (!text.length) return false;

        const rects = Array.from(range.getClientRects()).filter(
            (rect) => rect.width > 0 && rect.height > 0
        );
        if (!rects.length) return false;

        const containsPoint = rects.some(
            (rect) => x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
        );
        if (!containsPoint) return false;

        return text.length >= Math.min(CHUNK_MIN_LENGTH, 2);
    }

    function getCaretRangeFromPoint(x, y) {
        if (document.caretRangeFromPoint) {
            return document.caretRangeFromPoint(x, y);
        }

        if (document.caretPositionFromPoint) {
            const caretPosition = document.caretPositionFromPoint(x, y);
            if (!caretPosition) return null;
            const range = document.createRange();
            range.setStart(caretPosition.offsetNode, caretPosition.offset);
            range.collapse(true);
            return range;
        }

        return null;
    }

    function getNearestTextNode(node, x, y, offset = 0) {
        if (!node) return null;
        if (node.nodeType === Node.TEXT_NODE) return node;

        const childNodes = Array.from(node.childNodes || []);
        const candidateNode = childNodes[Math.max(0, Math.min(offset, childNodes.length - 1))];
        const directTextNode = findTextNode(candidateNode);
        if (directTextNode) return directTextNode;

        const target = document.elementFromPoint(x, y);
        if (target?.closest?.("#edge-translate-root, #edge-translate-button")) return null;

        return findTextNode(target) || findTextNode(node);
    }

    function findTextNode(rootNode) {
        if (!rootNode) return null;
        if (rootNode.nodeType === Node.TEXT_NODE) return rootNode;

        const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT, {
            acceptNode(textNode) {
                return textNode.textContent?.trim()
                    ? NodeFilter.FILTER_ACCEPT
                    : NodeFilter.FILTER_REJECT;
            },
        });

        return walker.nextNode();
    }

    function shouldIgnoreLongPressTarget(target) {
        if (!(target instanceof Element)) return true;

        return Boolean(
            target.closest(
                "#edge-translate-button, #edge-translate-root, #edge-translate-screenshot-overlay, input, textarea, select, button, a, [contenteditable=''], [contenteditable='true']"
            )
        );
    }

    function getChunkContext(textNode, rawOffset) {
        const container = getSentenceContainer(textNode);
        const textNodes = collectTextNodes(container);
        if (!textNodes.length) return null;

        const entries = [];
        let fullText = "";
        textNodes.forEach((node) => {
            const start = fullText.length;
            const text = node.textContent || "";
            fullText += text;
            entries.push({
                node,
                start,
                end: start + text.length,
            });
        });

        const entry = entries.find((item) => item.node === textNode);
        if (!entry) return null;

        const globalOffset = resolveSentenceOffset(fullText, entry.start + rawOffset);
        if (globalOffset === null) return null;

        const bounds = getChunkBounds(fullText, globalOffset);
        if (!bounds || bounds.start >= bounds.end) return null;

        return {
            start: locateTextPosition(entries, bounds.start),
            end: locateTextPosition(entries, bounds.end),
        };
    }

    function getSentenceContainer(textNode) {
        let element = textNode.parentElement;
        while (element && element !== document.body && element !== document.documentElement) {
            const display = window.getComputedStyle(element).display;
            if (
                /^(P|DIV|LI|TD|TH|BLOCKQUOTE|ARTICLE|SECTION|MAIN|ASIDE|PRE|H[1-6])$/.test(
                    element.tagName
                ) ||
                ["block", "list-item", "table-cell"].includes(display)
            ) {
                return element;
            }
            element = element.parentElement;
        }

        return textNode.parentElement || document.body;
    }

    function collectTextNodes(rootNode) {
        if (!rootNode) return [];
        const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT, {
            acceptNode(textNode) {
                if (!textNode.textContent?.trim()) return NodeFilter.FILTER_REJECT;
                if (shouldIgnoreLongPressTarget(textNode.parentElement)) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            },
        });

        const textNodes = [];
        let currentNode = walker.nextNode();
        while (currentNode) {
            textNodes.push(currentNode);
            currentNode = walker.nextNode();
        }
        return textNodes;
    }

    function resolveSentenceOffset(text, rawOffset) {
        if (!text || !text.length) return null;
        let offset = Math.max(0, Math.min(rawOffset, text.length));
        if (offset === text.length) offset -= 1;

        if (text[offset] && !/\s/.test(text[offset])) return offset;
        if (offset > 0 && text[offset - 1] && !/\s/.test(text[offset - 1])) return offset - 1;

        let left = offset - 1;
        let right = offset + 1;
        while (left >= 0 || right < text.length) {
            if (left >= 0 && text[left] && !/\s/.test(text[left])) return left;
            if (right < text.length && text[right] && !/\s/.test(text[right])) return right;
            left -= 1;
            right += 1;
        }

        return null;
    }

    function getChunkBounds(text, offset) {
        const segments = splitIntoSentenceSegments(text);
        if (!segments.length) return null;

        const currentIndex = segments.findIndex(
            (segment) => offset >= segment.start && offset < segment.end
        );
        if (currentIndex === -1) return null;

        let startIndex = currentIndex;
        let endIndex = currentIndex;
        let currentLength = segments[currentIndex].trimmedLength;

        while (currentLength < CHUNK_TARGET_LENGTH) {
            const previousSegment = segments[startIndex - 1];
            const nextSegment = segments[endIndex + 1];
            const previousLength = previousSegment?.trimmedLength || 0;
            const nextLength = nextSegment?.trimmedLength || 0;

            if (!previousSegment && !nextSegment) break;

            const shouldTakePrevious = previousLength >= nextLength;
            const candidateSegment = shouldTakePrevious ? previousSegment : nextSegment;
            if (!candidateSegment) {
                if (shouldTakePrevious) {
                    endIndex += 1;
                    currentLength += nextLength;
                } else {
                    startIndex -= 1;
                    currentLength += previousLength;
                }
                continue;
            }

            if (currentLength + candidateSegment.trimmedLength > CHUNK_MAX_LENGTH) break;

            if (shouldTakePrevious) {
                startIndex -= 1;
                currentLength += previousLength;
            } else {
                endIndex += 1;
                currentLength += nextLength;
            }
        }

        let start = segments[startIndex].trimmedStart;
        let end = segments[endIndex].trimmedEnd;

        if (currentLength > CHUNK_MAX_LENGTH) {
            end = Math.min(end, start + CHUNK_MAX_LENGTH);
        }

        if (end - start < CHUNK_MIN_LENGTH) {
            const currentSegment = segments[currentIndex];
            start = currentSegment.trimmedStart;
            end = currentSegment.trimmedEnd;
        }

        while (start < end && /\s/.test(text[start])) start += 1;
        while (end > start && /\s/.test(text[end - 1])) end -= 1;

        return start < end ? { start, end } : null;
    }

    function splitIntoSentenceSegments(text) {
        const segments = [];
        let segmentStart = 0;

        for (let i = 0; i < text.length; i++) {
            const character = text[i];
            if (!SENTENCE_BOUNDARY_REGEXP.test(character)) continue;

            let segmentEnd = i + 1;
            while (segmentEnd < text.length && SENTENCE_TRAILING_REGEXP.test(text[segmentEnd])) {
                segmentEnd += 1;
            }
            pushSegment(segmentStart, segmentEnd);
            segmentStart = segmentEnd;
        }

        pushSegment(segmentStart, text.length);
        return segments;

        function pushSegment(start, end) {
            let trimmedStart = start;
            let trimmedEnd = end;
            while (trimmedStart < trimmedEnd && /\s/.test(text[trimmedStart])) trimmedStart += 1;
            while (trimmedEnd > trimmedStart && /\s/.test(text[trimmedEnd - 1])) trimmedEnd -= 1;
            if (trimmedStart >= trimmedEnd) return;

            segments.push({
                start,
                end,
                trimmedStart,
                trimmedEnd,
                trimmedLength: trimmedEnd - trimmedStart,
            });
        }
    }

    function locateTextPosition(entries, index) {
        if (!entries.length) return null;

        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            if (index <= entry.end) {
                return {
                    node: entry.node,
                    offset: Math.max(
                        0,
                        Math.min(entry.node.textContent.length, index - entry.start)
                    ),
                };
            }
        }

        const lastEntry = entries[entries.length - 1];
        return {
            node: lastEntry.node,
            offset: lastEntry.node.textContent.length,
        };
    }

    function renderLongPressHighlight(range) {
        clearLongPressHighlight();
        if (!range) return;

        const rects = Array.from(range.getClientRects()).filter(
            (rect) => rect.width > 0 && rect.height > 0
        );
        if (!rects.length) return;

        if (!longPressHighlightContainer) {
            longPressHighlightContainer = document.createElement("div");
            longPressHighlightContainer.id = LONG_PRESS_HIGHLIGHT_ID;
            document.documentElement.appendChild(longPressHighlightContainer);
        }

        rects.forEach((rect) => {
            const block = document.createElement("div");
            Object.assign(block.style, {
                position: "fixed",
                left: `${rect.left}px`,
                top: `${rect.top}px`,
                width: `${rect.width}px`,
                height: `${rect.height}px`,
                borderRadius: "4px",
                background: "rgba(74, 140, 247, 0.16)",
                boxShadow: "inset 0 0 0 1px rgba(74, 140, 247, 0.2)",
            });
            longPressHighlightContainer.appendChild(block);
        });
    }

    function clearLongPressHighlight() {
        if (!longPressHighlightContainer) return;
        longPressHighlightContainer.replaceChildren();
        if (longPressHighlightContainer.parentNode) {
            longPressHighlightContainer.parentNode.removeChild(longPressHighlightContainer);
        }
        longPressHighlightContainer = null;
    }

    /**
     * 处理发音快捷键
     */
    function pronounceSubmit() {
        let selection = getSelection();
        if (selection.text && selection.text.length > 0) {
            channel.request("pronounce", {
                text: selection.text,
                language: "auto",
            });
        }
    }

    /**
     * execute this function to make the translation button disappear
     */
    function disappearButton() {
        if (HasButtonShown) {
            document.documentElement.removeChild(translationButtonContainer);
            HasButtonShown = false;
        }
    }

    /**
     * the handler function to make the selection icon move with mouse scrolling
     * @param Event the event of scrolling
     */
    function scrollHandler() {
        if (HasButtonShown) {
            let distanceX = originScrollX - scrollingElement[scrollPropertyX];
            let distanceY = originScrollY - scrollingElement[scrollPropertyY];

            translationButtonContainer.style.left = `${originPositionX + distanceX}px`;
            translationButtonContainer.style.top = `${originPositionY + distanceY}px`;
        }
    }

    /**
     * whether the url of current page is in the blacklist
     *
     * @returns {Promise<boolean>} result in promise form
     */
    function isInBlacklist() {
        return getOrSetDefaultSettings("blacklist", DEFAULT_SETTINGS).then((result) => {
            let url = window.location.href;
            let blacklist = result.blacklist;
            return blacklist.domains[getDomain(url)] || blacklist.urls[url];
        });
    }

    /**
     * cancel text selection when translation is finished
     */
    function cancelTextSelection() {
        if (window.getSelection) {
            if (window.getSelection().empty) {
                // Chrome
                window.getSelection().empty();
            } else if (window.getSelection().removeAllRanges) {
                // Firefox
                window.getSelection().removeAllRanges();
            }
        } else if (document.selection) {
            // IE
            document.selection.empty();
        }
    }

    /**
     * 处理取消网页翻译的快捷键
     */
    function cancelPageTranslate() {
        let checkAndClick = (button) => {
            if (button !== null && button !== undefined) {
                button.click();
            }
        };

        let frame = document.getElementById(":0.container");
        if (frame !== null && frame !== undefined) {
            let cancelButton = frame.contentDocument.getElementById(":0.close");
            checkAndClick(cancelButton);
        }

        frame = document.getElementById("OUTFOX_JTR_BAR");
        if (frame !== null && frame !== undefined) {
            let cancelButton = frame.contentDocument.getElementById("OUTFOX_JTR_BAR_CLOSE");
            checkAndClick(cancelButton);
        }
    }

    /**
     * The container of the translation button can be either an iframe or a div with a shadow dom.
     * This function can get the inner parent of the container.
     * @param {HTMLIFrameElement|HTMLDivElement} container
     */
    function getInnerParent(container) {
        if (container.tagName === "IFRAME") return container.contentDocument.body;

        if (container.shadowRoot) return container.shadowRoot;

        container.attachShadow({ mode: "open" });
        return container.shadowRoot;
    }

    // provide user's selection result for the background module
    channel.provide("get_selection", () => Promise.resolve(getSelection()));
    if (window.top === window) {
        channel.provide("select_capture_area", () => Promise.resolve(startScreenshotSelection()));
    }

    // handler for shortcut command
    channel.on("command", (detail) => {
        switch (detail.command) {
            case "translate_selected":
                translateSubmit();
                break;
            case "pronounce_selected":
                pronounceSubmit();
                break;
            case "cancel_page_translate":
                cancelPageTranslate();
                break;
            default:
                break;
        }
    });

    function startScreenshotSelection() {
        if (screenshotSelectionSession) {
            return screenshotSelectionSession.promise;
        }

        let overlay = document.createElement("div");
        let mask = document.createElement("div");
        let selectionBox = document.createElement("div");
        let hint = document.createElement("div");
        let startPoint = null;
        let finished = false;
        let currentRect = null;

        overlay.id = "edge-translate-screenshot-overlay";
        Object.assign(overlay.style, {
            position: "fixed",
            inset: 0,
            zIndex: 2147483647,
            cursor: "crosshair",
            userSelect: "none",
        });

        Object.assign(mask.style, {
            position: "absolute",
            inset: 0,
            background: "rgba(0, 0, 0, 0.18)",
        });

        Object.assign(selectionBox.style, {
            position: "absolute",
            border: "2px solid #4a8cf7",
            background: "rgba(74, 140, 247, 0.15)",
            display: "none",
            boxSizing: "border-box",
        });

        hint.textContent = chrome.i18n.getMessage("ScreenshotTranslateHint");
        Object.assign(hint.style, {
            position: "absolute",
            top: "16px",
            left: "50%",
            transform: "translateX(-50%)",
            padding: "8px 12px",
            borderRadius: "999px",
            background: "rgba(17, 24, 39, 0.9)",
            color: "#fff",
            fontSize: "13px",
            lineHeight: 1.2,
            fontFamily: "system-ui, sans-serif",
            whiteSpace: "nowrap",
            boxShadow: "0 6px 18px rgba(0, 0, 0, 0.2)",
        });

        overlay.appendChild(mask);
        overlay.appendChild(selectionBox);
        overlay.appendChild(hint);
        document.documentElement.appendChild(overlay);

        const cleanup = () => {
            window.removeEventListener("keydown", keydownHandler, true);
            overlay.removeEventListener("mousedown", mousedownHandler, true);
            overlay.removeEventListener("mousemove", mousemoveHandler, true);
            overlay.removeEventListener("mouseup", mouseupHandler, true);
            if (document.documentElement.contains(overlay)) {
                document.documentElement.removeChild(overlay);
            }
            screenshotSelectionSession = null;
        };

        const resolveSelection = (value) => {
            if (finished) return;
            finished = true;
            const { resolve } = screenshotSelectionSession;
            cleanup();
            resolve(value);
        };

        const keydownHandler = (event) => {
            if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                resolveSelection(null);
            }
        };

        const mousedownHandler = (event) => {
            if (event.button !== 0) return;
            event.preventDefault();
            event.stopPropagation();
            startPoint = { x: event.clientX, y: event.clientY };
            currentRect = null;
            selectionBox.style.display = "block";
            updateSelectionBox(startPoint.x, startPoint.y, 0, 0);
        };

        const mousemoveHandler = (event) => {
            if (!startPoint) return;
            event.preventDefault();
            event.stopPropagation();
            currentRect = normalizeRect(startPoint.x, startPoint.y, event.clientX, event.clientY);
            updateSelectionBox(
                currentRect.left,
                currentRect.top,
                currentRect.width,
                currentRect.height
            );
        };

        const mouseupHandler = (event) => {
            if (event.button !== 0 || !startPoint) return;
            event.preventDefault();
            event.stopPropagation();
            currentRect = normalizeRect(startPoint.x, startPoint.y, event.clientX, event.clientY);
            if (currentRect.width < 8 || currentRect.height < 8) {
                resolveSelection(null);
                return;
            }

            resolveSelection({
                rect: currentRect,
                position: [currentRect.left, currentRect.top],
                viewportWidth: window.innerWidth,
                viewportHeight: window.innerHeight,
            });
        };

        overlay.addEventListener("mousedown", mousedownHandler, true);
        overlay.addEventListener("mousemove", mousemoveHandler, true);
        overlay.addEventListener("mouseup", mouseupHandler, true);
        window.addEventListener("keydown", keydownHandler, true);

        screenshotSelectionSession = {};
        screenshotSelectionSession.promise = new Promise((resolve) => {
            screenshotSelectionSession.resolve = resolve;
        });

        return screenshotSelectionSession.promise;

        function normalizeRect(startX, startY, endX, endY) {
            const left = Math.max(0, Math.min(startX, endX));
            const top = Math.max(0, Math.min(startY, endY));
            const right = Math.min(window.innerWidth, Math.max(startX, endX));
            const bottom = Math.min(window.innerHeight, Math.max(startY, endY));
            return {
                left,
                top,
                width: Math.max(0, right - left),
                height: Math.max(0, bottom - top),
            };
        }

        function updateSelectionBox(left, top, width, height) {
            selectionBox.style.left = `${left}px`;
            selectionBox.style.top = `${top}px`;
            selectionBox.style.width = `${width}px`;
            selectionBox.style.height = `${height}px`;
        }
    }
}
