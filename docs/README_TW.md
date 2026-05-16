# 側邊翻譯 - 瀏覽器翻譯插件 | PDF 翻譯 | MV3 | 開源免費

查看其他語言版本：

-   [English](../README.md)
-   [简体中文](./README_CN.md)
-   [Русский](./README_RU.md)

## 展示

### 劃詞翻譯範例

![selection_translation_demo_zh_TW](./images/demo_zh_TW.gif)

### 長按翻譯範例

![long_press_translate](./images/long_press_translate.gif)

### 截圖翻譯範例

![screenshot_translate](./images/screenshot_translate.gif)

### PDF 翻譯權限設定

如果要翻譯瀏覽器開啟的本機 PDF 檔案，請按以下步驟開啟權限：

-   在側邊翻譯設定頁開啟`使用內建的 PDF 檢視器`。
-   開啟瀏覽器擴充功能詳細資料頁：
    -   Chrome：`chrome://extensions/?id=dpdpboiiginghjjmndfdjeackcibfcnb`
    -   Microsoft Edge：`edge://extensions`
-   為側邊翻譯開啟`允許存取檔案網址`。
-   重新整理已開啟的 PDF 分頁。

## 從商店安裝

建議從 [Chrome 線上應用程式商店](https://chromewebstore.google.com/detail/edge-translate-browser-tr/dpdpboiiginghjjmndfdjeackcibfcnb) 安裝側邊翻譯。Chrome 可以直接安裝，Microsoft Edge 也支援從 Chrome 線上應用程式商店安裝。

### Chrome

-   開啟 [Chrome 線上應用程式商店頁面](https://chromewebstore.google.com/detail/edge-translate-browser-tr/dpdpboiiginghjjmndfdjeackcibfcnb)。
-   點擊`加到 Chrome`。
-   依照瀏覽器提示確認安裝。

### Microsoft Edge

-   在 Microsoft Edge 中開啟 [Chrome 線上應用程式商店頁面](https://chromewebstore.google.com/detail/edge-translate-browser-tr/dpdpboiiginghjjmndfdjeackcibfcnb)。
-   如果瀏覽器提示，請允許安裝來自其他商店的擴充功能。
-   點擊`加到 Chrome`。
-   依照瀏覽器提示確認安裝。

## 手動安裝

如果需要手動安裝發佈封裝檔，或載入解壓後的本地建置產物，可從 [GitHub Releases](https://github.com/three-water666/EdgeTranslate/releases) 取得發佈封裝檔。

### Chrome

-   將擴充套件封裝檔解壓到本機目錄。
-   開啟 `chrome://extensions`。
-   啟用`開發人員模式`。
-   點擊`載入未封裝項目`。
-   選擇解壓後的擴充套件目錄。

### Microsoft Edge

-   將擴充套件封裝檔解壓到本機目錄。
-   開啟 `edge://extensions`。
-   啟用`開發人員模式`。
-   點擊`載入解壓縮的擴充功能`。
-   選擇解壓後的擴充套件目錄。

## 本地建置

建置擴充套件前，請先安裝 [Node.js](https://nodejs.org/) 與 [pnpm](https://pnpm.io/installation)。

複製儲存庫：

```shell
git clone https://github.com/three-water666/EdgeTranslate.git
```

安裝相依套件：

```shell
pnpm install
```

建置擴充套件：

```shell
pnpm build
```

建置完成後，可在以下目錄找到解壓版擴充套件：

-   `./packages/EdgeTranslate/build/chrome/`

打包 zip：

```shell
pnpm package
```

打包完成後，可在以下目錄找到發佈封裝檔：

-   `./packages/EdgeTranslate/artifacts/`

啟動帶檔案監聽的開發建置：

```shell
pnpm dev
```

開發建置輸出目錄為：

-   `./packages/EdgeTranslate/dev/chrome/`

## 致謝

本專案基於原開源專案 [Edge Translate](https://github.com/EdgeTranslate/EdgeTranslate) 持續維護，感謝原作者與貢獻者的工作。

## 開源授權

[MIT](../LICENSE.MIT) 和 [NPL](../LICENSE.NPL)
