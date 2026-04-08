import { isChromePDFViewer } from "./common.js";
import Channel from "common/scripts/channel.js";
import { DEFAULT_SETTINGS, getOrSetDefaultSettings } from "common/scripts/settings.js";

const channel = new Channel();
const POLL_INTERVAL = 100;
const POLL_TIMEOUT = 5000;
let redirectHandled = false;

function tryRedirectPDFViewer() {
    if (redirectHandled || !isChromePDFViewer()) {
        return false;
    }

    redirectHandled = true;
    let state = history.state;
    const pdfSrc = getPDFSource();

    if (state === null) {
        state = { ET_visited: true };
        history.replaceState(state, document.title, window.location.href);
        redirect(pdfSrc);
    } else if (!state.ET_visited) {
        state.ET_visited = true;
        history.replaceState(state, document.title, window.location.href);
        redirect(pdfSrc);
    } else {
        state.ET_visited = false;
        history.replaceState(state, document.title, window.location.href);
    }

    return true;
}

function getPDFSource() {
    const firstChild = document.body?.children?.[0];

    if (firstChild?.src && firstChild.src !== "about:blank") {
        return firstChild.src;
    }

    return window.location.href;
}

function bootstrapPDFRedirect() {
    if (tryRedirectPDFViewer()) {
        return;
    }

    const startedAt = Date.now();
    const timer = window.setInterval(() => {
        if (tryRedirectPDFViewer() || Date.now() - startedAt >= POLL_TIMEOUT) {
            window.clearInterval(timer);
        }
    }, POLL_INTERVAL);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrapPDFRedirect, { once: true });
} else {
    bootstrapPDFRedirect();
}

window.addEventListener("load", tryRedirectPDFViewer, { once: true });

function redirect(pdfSrc) {
    getOrSetDefaultSettings("OtherSettings", DEFAULT_SETTINGS).then((result) => {
        let OtherSettings = result.OtherSettings;
        if (OtherSettings && OtherSettings["UsePDFjs"]) {
            channel.emit("redirect", {
                url: chrome.runtime.getURL(`pdf/viewer.html?file=${encodeURIComponent(pdfSrc)}`),
            });
        }
    });
}
