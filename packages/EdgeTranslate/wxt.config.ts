import { defineConfig } from 'wxt';
import preact from '@preact/preset-vite';
import svgr from 'vite-plugin-svgr';
import path from 'path';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [preact(), svgr()],
    resolve: {
      alias: {
        'react': 'preact/compat',
        'react-dom': 'preact/compat',
        'common': path.resolve(__dirname, 'common'),
      },
    },
  }),
  manifest: {
    name: "__MSG_AppName__",
    description: "__MSG_Description__",
    default_locale: "en",
    icons: {
      16: "icon/icon16.png",
      48: "icon/icon48.png",
      128: "icon/icon128.png"
    },
    action: {
      default_icon: {
        16: "icon/icon16.png",
        48: "icon/icon48.png",
        128: "icon/icon128.png"
      },
      default_popup: "popup.html"
    },
    permissions: [
      "notifications",
      "contextMenus",
      "storage",
      "cookies",
      "tabs",
      "webRequest",
      "declarativeNetRequest",
      "alarms",
      "scripting",
      "tts",
      "offscreen",
      "activeTab"
    ],
    host_permissions: ["<all_urls>"],
    web_accessible_resources: [
      {
        resources: ["*.css", "*.png", "google/*"],
        matches: ["<all_urls>"]
      }
    ],
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'"
    },
    commands: {
        "_execute_action": {
            "suggested_key": {
                "default": "Alt+Q"
            }
        },
        "change_language_setting": {
            "description": "__MSG_ChangeLanguageSetting__"
        },
        "translate_selected": {
            "description": "__MSG_TranslateSelectedText__"
        },
        "fix_result_frame": {
            "suggested_key": {
                "default": "Alt+X"
            },
            "description": "__MSG_FixResultFrame__"
        },
        "close_result_frame": {
            "suggested_key": {
                "default": "Alt+C"
            },
            "description": "__MSG_CloseResultFrame__"
        },
        "exchange_source_target_lang": {
            "suggested_key": {
                "default": "Alt+S"
            },
            "description": "__MSG_ExchangeSourceAndTargetLanguage__"
        },
        "pronounce_selected": {
            "description": "__MSG_PronounceSelected__"
        },
        "pronounce_original": {
            "description": "__MSG_PronounceOriginal__"
        },
        "pronounce_translated": {
            "description": "__MSG_PronounceTranslated__"
        },
        "copy_result": {
            "description": "__MSG_CopyResult__"
        },
        "change_mutual_translate": {
            "description": "__MSG_MutualTranslation__"
        },
        "translate_page": {
            "description": "__MSG_TranslatePage__"
        },
        "cancel_page_translate": {
            "description": "__MSG_CancelPageTranslate__"
        },
        "toggle_page_translate_banner": {
            "description": "__MSG_TogglePageTranslateBanner__"
        }
    }
  },
});
