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

## 手动安装

插件目前还没有上架浏览器商店，现阶段可通过发布页安装包或解压后的本地构建产物手动安装。发布页地址：[GitHub Releases](https://github.com/three-water666/EdgeTranslate/releases)。

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
