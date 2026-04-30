import Channel from "common/scripts/channel.js";
import { registerKeyboardCommandHandlers } from "./commands/keyboard_commands.js";
import { hotReload } from "./dev/hot_reload.js";
import { registerBlacklistTabHandlers } from "./menus/blacklist_tab_events.js";
import { registerContextMenus } from "./menus/context_menus.js";
import { registerChannelEvents } from "./runtime/channel_events.js";
import { registerNotificationHandlers } from "./runtime/notifications.js";
import { registerInstallHandlers } from "./startup/install.js";
import { createTranslationModule, registerTranslationModule } from "./translation/index.js";

if (typeof BUILD_ENV !== "undefined" && BUILD_ENV === "development") {
    hotReload();
}

const channel = new Channel();
const translationModule = createTranslationModule(channel);

registerBackgroundHandlers(channel, translationModule);

function registerBackgroundHandlers(channel, translationModule) {
    // background.js 只负责注册扩展入口。菜单、快捷键、channel RPC、
    // storage/channel 事件的具体逻辑都下沉到对应功能模块。
    registerInstallHandlers();
    registerNotificationHandlers();
    registerContextMenus({
        channel,
        ...translationModule.contextMenuServices,
    });
    registerBlacklistTabHandlers();
    registerChannelEvents(channel);
    registerTranslationModule(channel, translationModule);
    registerKeyboardCommandHandlers(channel);
}
