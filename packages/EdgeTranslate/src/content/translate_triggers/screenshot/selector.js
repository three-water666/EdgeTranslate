export function createScreenshotSelector() {
    let session = null;
    return { start: () => session?.promise || createSession((value) => (session = value)) };
}

const CLICK_SUPPRESSION_FALLBACK_DELAY = 80;

function createSession(updateSession) {
    const view = createOverlayView();
    const pointerState = { startPoint: null, currentRect: null, finished: false };
    const session = { promise: null, resolve: null };
    const handlers = createSessionHandlers(view, pointerState, session, () => updateSession(null));

    registerSessionHandlers(view.overlay, handlers);
    session.promise = new Promise((resolve) => {
        session.resolve = resolve;
    });
    updateSession(session);
    return session.promise;
}

function createOverlayView() {
    const overlay = document.createElement("div");
    const mask = document.createElement("div");
    const selectionBox = document.createElement("div");
    const hint = document.createElement("div");

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
    return { overlay, selectionBox };
}

function createSessionHandlers(view, pointerState, session, clearSession) {
    let handlers = null;
    const resolver = createSelectionResolver({
        view,
        pointerState,
        session,
        clearSession,
        getHandlers: () => handlers,
    });

    handlers = {
        keydownHandler(event) {
            if (event.key !== "Escape") return;
            consumeEvent(event);
            resolver.resolveSelection(null);
        },
        mousedownHandler(event) {
            if (event.button !== 0) return;
            consumeEvent(event);
            pointerState.startPoint = { x: event.clientX, y: event.clientY };
            pointerState.currentRect = null;
            view.selectionBox.style.display = "block";
            updateSelectionBox(view.selectionBox, {
                left: event.clientX,
                top: event.clientY,
                width: 0,
                height: 0,
            });
        },
        mousemoveHandler(event) {
            if (!pointerState.startPoint) return;
            consumeEvent(event);
            pointerState.currentRect = normalizeRect(
                pointerState.startPoint.x,
                pointerState.startPoint.y,
                event.clientX,
                event.clientY
            );
            updateSelectionBox(view.selectionBox, pointerState.currentRect);
        },
        mouseupHandler(event) {
            if (event.button !== 0 || !pointerState.startPoint) return;
            consumeEvent(event);
            pointerState.currentRect = normalizeRect(
                pointerState.startPoint.x,
                pointerState.startPoint.y,
                event.clientX,
                event.clientY
            );
            if (pointerState.currentRect.width < 8 || pointerState.currentRect.height < 8) {
                resolver.resolveSelection(null, true);
                return;
            }
            resolver.resolveSelection(
                {
                    rect: pointerState.currentRect,
                    position: [pointerState.currentRect.left, pointerState.currentRect.top],
                    viewportWidth: window.innerWidth,
                    viewportHeight: window.innerHeight,
                },
                true
            );
        },
        clickHandler(event) {
            consumeEvent(event);
            if (pointerState.finished) resolver.finalizePendingSelection();
        },
    };

    return handlers;
}

function createSelectionResolver({ view, pointerState, session, clearSession, getHandlers }) {
    let pendingResolution = null;
    let clickFallbackTimer = null;

    const cleanup = () => {
        if (clickFallbackTimer) {
            window.clearTimeout(clickFallbackTimer);
            clickFallbackTimer = null;
        }
        removeSessionHandlers(view.overlay, getHandlers());
        if (document.documentElement.contains(view.overlay)) {
            document.documentElement.removeChild(view.overlay);
        }
        clearSession();
    };

    const finalizeSelection = (value) => {
        cleanup();
        session.resolve(value);
    };

    const resolveSelection = (value, waitForClick = false) => {
        if (pointerState.finished) return;
        pointerState.finished = true;
        if (!waitForClick) {
            finalizeSelection(value);
            return;
        }
        pendingResolution = value;
        clickFallbackTimer = window.setTimeout(
            () => finalizeSelection(pendingResolution),
            CLICK_SUPPRESSION_FALLBACK_DELAY
        );
    };

    return {
        resolveSelection,
        finalizePendingSelection: () => finalizeSelection(pendingResolution),
    };
}

function registerSessionHandlers(overlay, handlers) {
    overlay.addEventListener("mousedown", handlers.mousedownHandler, true);
    overlay.addEventListener("mousemove", handlers.mousemoveHandler, true);
    overlay.addEventListener("mouseup", handlers.mouseupHandler, true);
    overlay.addEventListener("click", handlers.clickHandler, true);
    window.addEventListener("keydown", handlers.keydownHandler, true);
}

function removeSessionHandlers(overlay, handlers) {
    window.removeEventListener("keydown", handlers.keydownHandler, true);
    overlay.removeEventListener("mousedown", handlers.mousedownHandler, true);
    overlay.removeEventListener("mousemove", handlers.mousemoveHandler, true);
    overlay.removeEventListener("mouseup", handlers.mouseupHandler, true);
    overlay.removeEventListener("click", handlers.clickHandler, true);
}

function consumeEvent(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
}

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

function updateSelectionBox(selectionBox, rect) {
    selectionBox.style.left = `${rect.left}px`;
    selectionBox.style.top = `${rect.top}px`;
    selectionBox.style.width = `${rect.width}px`;
    selectionBox.style.height = `${rect.height}px`;
}
