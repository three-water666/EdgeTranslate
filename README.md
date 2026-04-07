# Edge Translate - Web Selection Translation Extension | PDF Translation | MV3 | Free and Open Source

Read this page in other languages:

-   [简体中文](./docs/README_CN.md)
-   [繁体中文](./docs/README_TW.md)
-   [Русский](./docs/README_RU.md)

## Demo

![demo_en](./docs/images/demo_en.gif)

## Manually Install

The extension has not been published to browser stores yet. For now, you can install it manually from the release packages or from an unpacked local build. Release packages are available at [GitHub Releases](https://github.com/three-water666/EdgeTranslate/releases).

### Chrome

-   Extract the extension package to a local folder.
-   Open `chrome://extensions`.
-   Enable `Developer mode`.
-   Click `Load unpacked`.
-   Select the extracted extension directory.

### Microsoft Edge

-   Extract the extension package to a local folder.
-   Open `edge://extensions`.
-   Enable `Developer mode`.
-   Click `Load unpacked`.
-   Select the extracted extension directory.

## Build It Yourself

To build the extension, install [Node.js](https://nodejs.org/) and [pnpm](https://pnpm.io/installation).

Clone the repository:

```shell
git clone https://github.com/three-water666/EdgeTranslate.git
```

Install dependencies:

```shell
pnpm install
```

Build the extension:

```shell
pnpm build
```

Create a zip package:

```shell
pnpm package
```

After the build finishes, the unpacked extension output is available under:

-   `./packages/EdgeTranslate/build/chrome/`

## Load Unpacked Extension In Your Browser

### Chrome

-   Open `chrome://extensions`.
-   Enable `Developer mode`.
-   Click `Load unpacked`.
-   Select `./packages/EdgeTranslate/build/chrome/`.

### Microsoft Edge

-   Open `edge://extensions`.
-   Enable `Developer mode`.
-   Click `Load unpacked`.
-   Select `./packages/EdgeTranslate/build/chrome/`.

## Acknowledgement

This project continues maintenance work based on the original open source project [Edge Translate](https://github.com/EdgeTranslate/EdgeTranslate). Thanks to the original authors and contributors for their work.

## License

[MIT](./LICENSE.MIT) and [NPL](./LICENSE.NPL)
