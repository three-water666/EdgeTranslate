export function registerNotificationHandlers() {
    chrome.notifications.onClicked.addListener((notificationId) => {
        switch (notificationId) {
            case "update_notification":
                chrome.tabs.create({
                    url: "https://github.com/three-water666/EdgeTranslate/releases",
                });
                break;
            default:
                break;
        }
    });
}
