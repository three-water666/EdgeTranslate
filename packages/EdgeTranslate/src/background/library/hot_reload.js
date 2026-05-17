import Channel from "common/scripts/channel.js";
import { ensureOffscreenDocument } from "./offscreen.js";

const HOT_RELOAD_EVENT = "hot_reload_start";
const HOT_RELOAD_DETECTED_EVENT = "hot_reload_detected";
const HOT_RELOAD_STAMP_PATH = "hot-reload.json";

const channel = new Channel();
let started = false;

export async function hotReload() {
    if (started) {
        return;
    }

    const self = await chrome.management.getSelf();
    if (self.installType !== "development") {
        return;
    }

    started = true;
    await ensureOffscreenDocument();
    channel.emit(HOT_RELOAD_EVENT, {
        stampUrl: chrome.runtime.getURL(HOT_RELOAD_STAMP_PATH),
    });
}

channel.on(HOT_RELOAD_DETECTED_EVENT, () => {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
            chrome.tabs.reload(tabs[0].id);
        }
        setTimeout(() => chrome.runtime.reload(), 150);
    });
});
