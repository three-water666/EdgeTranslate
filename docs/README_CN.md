# 侧边翻译 - 网页划词翻译插件 | PDF翻译 | MV3 | 开源免费


查看其他语言版本：

- [English](../README.md)
- [繁體中文](./README_TW.md)
- [Русский](./README_RU.md)

## 演示

![demo_zh_CN](./images/demo_zh_CN.gif)

## 手动安装

插件目前还没有上架浏览器商店，现阶段可通过发布页安装包或解压后的本地构建产物手动安装。发布页地址：[GitHub Releases](https://github.com/three-water666/EdgeTranslate/releases)。

### Chrome

- 将扩展包解压到本地目录。
- 打开 `chrome://extensions`。
- 开启`开发者模式`。
- 点击`加载已解压的扩展程序`。
- 选择解压后的扩展目录。

### Microsoft Edge

- 将扩展包解压到本地目录。
- 打开 `edge://extensions`。
- 开启`开发者模式`。
- 点击`加载解压缩的扩展`。
- 选择解压后的扩展目录。

## 本地构建

构建扩展前，请先安装 [Node.js](https://nodejs.org/) 和 [yarn](https://classic.yarnpkg.com/en/docs/install)。

克隆仓库：

```shell
git clone https://github.com/three-water666/EdgeTranslate.git
```

安装依赖：

```shell
yarn
```

构建扩展：

```shell
yarn build:chrome
```

构建完成后，可在以下目录找到解压版扩展：

- `./packages/EdgeTranslate/build/chrome/`

## 在浏览器中加载已解压扩展

### Chrome

- 打开 `chrome://extensions`。
- 开启`开发者模式`。
- 点击`加载已解压的扩展程序`。
- 选择 `./packages/EdgeTranslate/build/chrome/`。

### Microsoft Edge

- 打开 `edge://extensions`。
- 开启`开发者模式`。
- 点击`加载解压缩的扩展`。
- 选择 `./packages/EdgeTranslate/build/chrome/`。

## 致谢

本项目基于原开源项目 [Edge Translate](https://github.com/EdgeTranslate/EdgeTranslate) 持续维护，感谢原作者与贡献者的工作。

##  开源协议

[MIT](../LICENSE.MIT) 和 [NPL](../LICENSE.NPL)
