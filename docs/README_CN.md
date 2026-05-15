# 侧边翻译 - 浏览器翻译插件 | PDF 翻译 | MV3 | 开源免费

查看其他语言版本：

-   [English](../README.md)
-   [繁體中文](./README_TW.md)
-   [Русский](./README_RU.md)

## 演示

### 划词翻译示例

![selection_translation_demo_zh_CN](./images/demo_zh_CN.gif)

### 长按翻译示例

![long_press_translate](./images/long_press_translate.gif)

### 截图翻译示例

![screenshot_translate](./images/screenshot_translate.gif)

### PDF 翻译权限设置

如果要翻译浏览器打开的本地 PDF 文件，请按以下步骤开启权限：

-   在侧边翻译设置页开启`使用内置的 PDF 查看器`。
-   打开浏览器扩展详情页：
    -   Chrome：`chrome://extensions/?id=dpdpboiiginghjjmndfdjeackcibfcnb`
    -   Microsoft Edge：`edge://extensions`
-   为侧边翻译开启`允许访问文件网址`。
-   刷新已打开的 PDF 标签页。

## 从商店安装

推荐从 [Chrome 网上应用店](https://chromewebstore.google.com/detail/edge-translate-browser-tr/dpdpboiiginghjjmndfdjeackcibfcnb) 安装侧边翻译。Chrome 可以直接安装，Microsoft Edge 也支持从 Chrome 网上应用店安装。

### Chrome

-   打开 [Chrome 网上应用店页面](https://chromewebstore.google.com/detail/edge-translate-browser-tr/dpdpboiiginghjjmndfdjeackcibfcnb)。
-   点击`添加至 Chrome`。
-   按浏览器提示确认安装。

### Microsoft Edge

-   在 Microsoft Edge 中打开 [Chrome 网上应用店页面](https://chromewebstore.google.com/detail/edge-translate-browser-tr/dpdpboiiginghjjmndfdjeackcibfcnb)。
-   如果浏览器提示，请允许安装来自其他商店的扩展。
-   点击`添加至 Chrome`。
-   按浏览器提示确认安装。

## 手动安装

如果需要手动安装发布包，或加载解压后的本地构建产物，可从 [GitHub Releases](https://github.com/three-water666/EdgeTranslate/releases) 获取发布包。

### Chrome

-   将扩展包解压到本地目录。
-   打开 `chrome://extensions`。
-   开启`开发者模式`。
-   点击`加载已解压的扩展程序`。
-   选择解压后的扩展目录。

### Microsoft Edge

-   将扩展包解压到本地目录。
-   打开 `edge://extensions`。
-   开启`开发者模式`。
-   点击`加载解压缩的扩展`。
-   选择解压后的扩展目录。

## 本地构建

构建扩展前，请先安装 [Node.js](https://nodejs.org/) 和 [pnpm](https://pnpm.io/installation)。

克隆仓库：

```shell
git clone https://github.com/three-water666/EdgeTranslate.git
```

安装依赖：

```shell
pnpm install
```

构建扩展：

```shell
pnpm build
```

构建完成后，可在以下目录找到解压版扩展：

-   `./packages/EdgeTranslate/build/chrome/`

打包 zip：

```shell
pnpm package
```

打包完成后，可在以下目录找到发布包：

-   `./packages/EdgeTranslate/artifacts/`

启动带文件监听的开发构建：

```shell
pnpm dev
```

开发构建输出目录为：

-   `./packages/EdgeTranslate/dev/chrome/`

## 致谢

本项目基于原开源项目 [Edge Translate](https://github.com/EdgeTranslate/EdgeTranslate) 持续维护，感谢原作者与贡献者的工作。

## 开源协议

[MIT](../LICENSE.MIT) 和 [NPL](../LICENSE.NPL)
