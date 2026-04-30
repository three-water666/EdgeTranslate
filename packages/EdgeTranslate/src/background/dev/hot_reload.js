import Channel from "common/scripts/channel.js";
import { ensureOffscreenDocument } from "../offscreen/document.js";

const HOT_RELOAD_EVENT = "hot_reload_start";
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
