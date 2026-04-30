import { IMAGE_DATA } from "../shared/constants.js";

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

function getInnerParent(container) {
    if (container.tagName === "IFRAME") return container.contentDocument.body;
    if (!container.shadowRoot) container.attachShadow({ mode: "open" });
    return container.shadowRoot;
}

function getButtonPosition(positionSetting, container, event) {
    const offset = resolveButtonOffset(positionSetting, container);
    let left = event.x + offset.x;
    let top = event.y + offset.y;
    if (left <= 0 || left + container.clientWidth > window.innerWidth) {
        left = event.x - offset.x - container.clientWidth;
    }
    if (top <= 0 || top + container.clientHeight > window.innerHeight) {
        top = event.y - offset.y - container.clientHeight;
    }
    return { left, top };
}

function applyButtonImageStyle(buttonImage) {
    const buttonSize = "20px";
    Object.assign(buttonImage.style, {
        width: buttonSize,
        height: buttonSize,
        minWidth: 0,
        maxWidth: buttonSize,
        minHeight: 0,
        maxHeight: buttonSize,
        padding: 0,
        border: 0,
        margin: 0,
        verticalAlign: 0,
        filter: "none",
    });
}

function applyButtonStyle(translationButton) {
    const buttonSize = "20px";
    Object.assign(translationButton.style, {
        width: buttonSize,
        height: buttonSize,
        padding: "6px",
        margin: 0,
        borderRadius: "50%",
        boxSizing: "content-box",
        overflow: "hidden",
        border: "none",
        cursor: "pointer",
    });
}

function resolveButtonOffset(position, container) {
    const offsetX = 10;
    const offsetY = 20;
    switch (position) {
        case "TopLeft":
            return { x: -offsetX - container.clientWidth, y: -offsetY - container.clientHeight };
        case "BottomRight":
            return { x: offsetX, y: offsetY };
        case "BottomLeft":
            return { x: -offsetX - container.clientWidth, y: offsetY };
        case "TopRight":
        default:
            return { x: offsetX, y: -offsetY - container.clientHeight };
    }
}
