import Channel from "common/scripts/channel.js";

let sourceTTSSpeed = "fast";
let targetTTSSpeed = "fast";
const channel = new Channel();

function sourcePronounce(_, startPronounce) {
    if (startPronounce)
        channel
            .request("pronounce", {
                pronouncing: "source",
                text: window.translateResult.originalText,
                language: window.translateResult.sourceLanguage,
                speed: sourceTTSSpeed,
            })
            .then(() => {
                sourceTTSSpeed = sourceTTSSpeed === "fast" ? "slow" : "fast";
            });
    return startPronounce;
}

function targetPronounce(_, startPronounce) {
    if (startPronounce)
        channel
            .request("pronounce", {
                pronouncing: "target",
                text: window.translateResult.mainMeaning,
                language: window.translateResult.targetLanguage,
                speed: targetTTSSpeed,
            })
            .then(() => {
                targetTTSSpeed = targetTTSSpeed === "fast" ? "slow" : "fast";
            });
    return startPronounce;
}

function copyContent(_, action) {
    if (action.copy && action.element) {
        action.element.setAttribute("contenteditable", "true");
        action.element.focus();
        const range = document.createRange();
        range.selectNodeContents(action.element);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        document.execCommand("copy");
    } else if (!action.copy) {
        window.getSelection().removeAllRanges();
    }
    return action.copy;
}

function onKeyDownInTextEditor(event) {
    event.stopPropagation();
}

function onKeyUpInTextEditor(event) {
    event.stopPropagation();
}

function onTextEditorFocused(event) {
    event.target.addEventListener("keydown", onKeyDownInTextEditor);
    event.target.addEventListener("keyup", onKeyUpInTextEditor);
}

function onTextEditorBlurred(event) {
    event.target.removeEventListener("keydown", onKeyDownInTextEditor);
    event.target.removeEventListener("keyup", onKeyUpInTextEditor);
}

function editOriginalText(originalTextEle) {
    originalTextEle.addEventListener("focus", onTextEditorFocused);
    originalTextEle.addEventListener("blur", onTextEditorBlurred);
    setTimeout(() => originalTextEle.focus());
}

function submitEditedText(originalTextEle) {
    originalTextEle.removeEventListener("focus", onTextEditorFocused);
    originalTextEle.removeEventListener("blur", onTextEditorBlurred);

    let text = originalTextEle.textContent.trim();
    if (text.length > 0) {
        if (text.valueOf() !== window.translateResult.originalText.valueOf()) {
            channel.request("translate", { text });
        }
    } else {
        originalTextEle.textContent = window.translateResult.originalText;
    }
}

function _setEditing(_, state) {
    if (state.element) {
        if (state.edit) {
            editOriginalText(state.element);
        } else {
            submitEditedText(state.element);
        }
    }
    return state.edit;
}

export { copyContent, sourcePronounce, targetPronounce, _setEditing };
