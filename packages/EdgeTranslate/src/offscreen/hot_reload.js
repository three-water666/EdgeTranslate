let hotReloadTimer = null;
let hotReloadStamp = null;

async function fetchHotReloadStamp(stampUrl) {
    const response = await fetch(`${stampUrl}?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) {
        throw new Error(`Hot reload stamp request failed: ${response.status}`);
    }
    return response.text();
}

function reloadExtension() {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
            chrome.tabs.reload(tabs[0].id);
        }
        setTimeout(() => chrome.runtime.reload(), 150);
    });
}

export async function startHotReload({ stampUrl }) {
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
                reloadExtension();
                return;
            }
            hotReloadStamp = nextStamp;
        } catch (error) {
            console.error("Offscreen: Hot reload poll failed.", error);
        }
    }, 1000);
}
