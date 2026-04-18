import { IMAGE_DATA } from "./select.constants.js";
import {
    applyButtonImageStyle,
    applyButtonStyle,
    getButtonPosition,
    getInnerParent,
} from "./select.helpers.js";

export function initializeButtonContainer(state, onMouseDown) {
    const iframeContainer = state.translationButtonContainer;
    document.documentElement.appendChild(state.translationButtonContainer);
    if (state.translationButtonContainer.contentDocument === null) {
        state.translationButtonContainer = document.createElement("div");
        renderButton(state, onMouseDown);
    }
    document.documentElement.removeChild(iframeContainer);
    state.translationButtonContainer.id = "edge-translate-button";
    state.translationButtonContainer.style.backgroundColor = "white";
    state.translationButtonContainer.addEventListener("load", () =>
        renderButton(state, onMouseDown)
    );
}

export function showButton(state, event) {
    document.documentElement.appendChild(state.translationButtonContainer);
    const position = getButtonPosition(
        state.buttonPositionSetting,
        state.translationButtonContainer,
        event
    );
    state.translationButtonContainer.style.top = `${position.top}px`;
    state.translationButtonContainer.style.left = `${position.left}px`;
    state.originScrollX = state.scrollingElement[state.scrollPropertyX];
    state.originScrollY = state.scrollingElement[state.scrollPropertyY];
    state.originPositionX = position.left;
    state.originPositionY = position.top;
    state.hasButtonShown = true;
}

export function scrollHandler(state) {
    if (!state.hasButtonShown) return;
    const distanceX = state.originScrollX - state.scrollingElement[state.scrollPropertyX];
    const distanceY = state.originScrollY - state.scrollingElement[state.scrollPropertyY];
    state.translationButtonContainer.style.left = `${state.originPositionX + distanceX}px`;
    state.translationButtonContainer.style.top = `${state.originPositionY + distanceY}px`;
}

export function disappearButton(state) {
    if (!state.hasButtonShown) return;
    document.documentElement.removeChild(state.translationButtonContainer);
    state.hasButtonShown = false;
}

function renderButton(state, onMouseDown) {
    const buttonImage = document.createElement("img");
    const translationButton = document.createElement("div");
    const cleanStyle = { padding: 0, margin: 0, border: "none", overflow: "hidden" };

    buttonImage.src = IMAGE_DATA;
    applyButtonImageStyle(buttonImage);
    applyButtonStyle(translationButton);
    translationButton.appendChild(buttonImage);
    getInnerParent(state.translationButtonContainer).appendChild(translationButton);
    Object.assign(
        state.translationButtonContainer.contentDocument?.documentElement.style || {},
        cleanStyle
    );
    Object.assign(state.translationButtonContainer.contentDocument?.body.style || {}, cleanStyle);
    translationButton.addEventListener("mousedown", onMouseDown);
    translationButton.addEventListener("contextmenu", (event) => event.preventDefault());
}
