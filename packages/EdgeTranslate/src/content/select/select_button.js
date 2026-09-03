import { IMAGE_DATA } from "./select_constants.js";
import {
    applyButtonImageStyle,
    applyButtonStyle,
    getInnerParent,
    getSelection,
} from "./select_helpers.js";
import { cancelAutoAvoidRechecks, scheduleAutoAvoidRechecks } from "./select_button_auto_avoid.js";
import { getButtonAnchor } from "./select_button_anchor.js";
import { closeButtonHost, createButtonHost, showButtonLayer } from "./select_button_layer.js";
import { getButtonPlacement } from "./select_button_position.js";
import {
    clearPendingDirectionChange,
    isDuplicateButtonRequest,
    shiftButtonAnchor,
    shouldDeferDirectionChange,
} from "./select_button_session.js";

const BUTTON_ID = "edge-translate-button";

export function initializeButtonContainer(state, onMouseDown) {
    const iframeContainer = state.translationButtonContainer;
    state.translationButtonContainer.id = BUTTON_ID;
    document.documentElement.appendChild(state.translationButtonContainer);
    if (state.translationButtonContainer.contentDocument === null) {
        state.translationButtonContainer = document.createElement("div");
        renderButton(state, onMouseDown);
    }
    document.documentElement.removeChild(iframeContainer);
    state.translationButtonContainer.id = BUTTON_ID;
    state.translationButtonContainer.style.backgroundColor = "white";
    state.translationButtonContainer.style.pointerEvents = "auto";
    state.translationButtonHost = createButtonHost(state, () => disappearButton(state));
    state.translationButtonContainer.addEventListener("load", () =>
        renderButton(state, onMouseDown)
    );
}

export function showButton(state, event) {
    const selection = getSelection();
    const anchor = getButtonAnchor(event);
    if (isDuplicateButtonRequest(state, selection, anchor)) return;

    state.buttonSelection = selection;
    state.buttonAnchor = anchor;
    state.buttonPlacementDirection = null;
    state.buttonShownAt = Date.now();
    showButtonLayer(state);
    positionButton(state);
    state.hasButtonShown = true;
    scheduleAutoAvoidRechecks(state, () => {
        showButtonLayer(state);
        positionButton(state, { isRecheck: true });
    });
}

export function scrollHandler(state) {
    if (!state.hasButtonShown) return;
    const distanceX = state.originScrollX - state.scrollingElement[state.scrollPropertyX];
    const distanceY = state.originScrollY - state.scrollingElement[state.scrollPropertyY];
    const left = state.originPositionX + distanceX;
    const top = state.originPositionY + distanceY;
    state.translationButtonContainer.style.left = `${left}px`;
    state.translationButtonContainer.style.top = `${top}px`;
    shiftButtonAnchor(state.buttonAnchor, distanceX, distanceY);
    state.originScrollX = state.scrollingElement[state.scrollPropertyX];
    state.originScrollY = state.scrollingElement[state.scrollPropertyY];
    state.originPositionX = left;
    state.originPositionY = top;
}

export function disappearButton(state) {
    if (!state.hasButtonShown) return;
    cancelAutoAvoidRechecks(state);
    closeButtonHost(state.translationButtonHost);
    if (document.documentElement.contains(state.translationButtonContainer)) {
        document.documentElement.removeChild(state.translationButtonContainer);
    }
    state.hasButtonShown = false;
    state.buttonAnchor = null;
    state.buttonPlacementDirection = null;
    state.buttonSelection = null;
    state.buttonShownAt = null;
}

function positionButton(state, { isRecheck = false } = {}) {
    const placement = getButtonPlacement(
        state.buttonPositionSetting,
        state.translationButtonContainer,
        state.buttonAnchor,
        { currentDirection: state.buttonPlacementDirection }
    );
    if (
        shouldDeferDirectionChange(state, placement, isRecheck, () =>
            positionButton(state, { isRecheck: true })
        )
    ) {
        return;
    }

    clearPendingDirectionChange(state);
    state.buttonPlacementDirection = placement.direction;
    state.translationButtonContainer.style.top = `${placement.top}px`;
    state.translationButtonContainer.style.left = `${placement.left}px`;
    state.originScrollX = state.scrollingElement[state.scrollPropertyX];
    state.originScrollY = state.scrollingElement[state.scrollPropertyY];
    state.originPositionX = placement.left;
    state.originPositionY = placement.top;
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
