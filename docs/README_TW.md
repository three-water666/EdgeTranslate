# 側邊翻譯 - 網頁劃詞翻譯插件 | PDF 翻譯 | MV3 | 開源免費

查看其他語言版本：

-   [English](../README.md)
-   [简体中文](./README_CN.md)
-   [Русский](./README_RU.md)

## 展示

![demo_zh_TW](./images/demo_zh_TW.gif)

## 手動安裝

外掛目前尚未上架瀏覽器商店，現階段可透過發佈頁安裝封裝檔或解壓後的本地建置產物手動安裝。發佈頁地址：[GitHub Releases](https://github.com/three-water666/EdgeTranslate/releases)。

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

打包 zip：

```shell
pnpm package
```

建置完成後，可在以下目錄找到解壓版擴充套件：

-   `./packages/EdgeTranslate/build/chrome/`

## 在瀏覽器中載入已解壓擴充套件

### Chrome

-   開啟 `chrome://extensions`。
-   啟用`開發人員模式`。
-   點擊`載入未封裝項目`。
-   選擇 `./packages/EdgeTranslate/build/chrome/`。

### Microsoft Edge

-   開啟 `edge://extensions`。
-   啟用`開發人員模式`。
-   點擊`載入解壓縮的擴充功能`。
-   選擇 `./packages/EdgeTranslate/build/chrome/`。

## 致謝

本專案基於原開源專案 [Edge Translate](https://github.com/EdgeTranslate/EdgeTranslate) 持續維護，感謝原作者與貢獻者的工作。

## 開源授權

[MIT](../LICENSE.MIT) 和 [NPL](../LICENSE.NPL)
