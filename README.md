# Edge Translate - Browser Translation Extension | PDF Translation | MV3 | Free and Open Source

Read this page in other languages:

-   [简体中文](./docs/README_CN.md)
-   [繁体中文](./docs/README_TW.md)
-   [Русский](./docs/README_RU.md)

## Demo

### Selection Translation Example

![selection_translation_demo_en](./docs/images/demo_en.gif)

### Long-Press Translation Example

![long_press_translate](./docs/images/long_press_translate.gif)

### Screenshot Translation Example

![screenshot_translate](./docs/images/screenshot_translate.gif)

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

After the build finishes, the unpacked extension output is available under:

-   `./packages/EdgeTranslate/build/chrome/`

Create a zip package:

```shell
pnpm package
```

After packaging finishes, the release package is available under:

-   `./packages/EdgeTranslate/artifacts/`

Start a development build with file watching:

```shell
pnpm dev
```

The development output is available under:

-   `./packages/EdgeTranslate/dev/chrome/`

## Acknowledgement

This project continues maintenance work based on the original open source project [Edge Translate](https://github.com/EdgeTranslate/EdgeTranslate). Thanks to the original authors and contributors for their work.

## License

[MIT](./LICENSE.MIT) and [NPL](./LICENSE.NPL)
