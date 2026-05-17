let hotReloadTimer = null;
let hotReloadStamp = null;
const HOT_RELOAD_DETECTED_EVENT = "hot_reload_detected";

async function fetchHotReloadStamp(stampUrl) {
    const response = await fetch(`${stampUrl}?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) {
        throw new Error(`Hot reload stamp request failed: ${response.status}`);
    }
    return response.text();
}

function notifyHotReloadDetected(channel) {
    if (channel) {
        channel.emit(HOT_RELOAD_DETECTED_EVENT);
        return;
    }

    chrome.runtime.reload();
}

export async function startHotReload({ stampUrl }, channel) {
    if (!stampUrl || hotReloadTimer) {
        return;
    }

    hotReloadStamp = await fetchHotReloadStamp(stampUrl);
    hotReloadTimer = setInterval(async () => {
        try {
            const nextStamp = await fetchHotReloadStamp(stampUrl);
            if (nextStamp !== hotReloadStamp) {
                clearInterval(hotReloadTimer);
                hotReloadTimer = null;
                notifyHotReloadDetected(channel);
                return;
            }
            hotReloadStamp = nextStamp;
        } catch (error) {
            console.error("Offscreen: Hot reload poll failed.", error);
        }
    }, 1000);
}
