# PDF.js Vendor Assets

This directory stores the official PDF.js generic viewer release used by the
extension PDF viewer.

Current version: `5.7.284`

Source:

`https://github.com/mozilla/pdf.js/releases/download/v5.7.284/pdfjs-5.7.284-dist.zip`

The checked-in files are treated as official vendor input. Do not edit files
under a versioned directory directly. Put Edge Translate integration logic in
`scripts/sync-pdfjs-assets.js`, which copies the vendor files into the extension
build output and applies the small build-time patches needed for extension use.
Those output-only patches inject Edge Translate content scripts, relax PDF.js'
file URL validation for extension pages, clear the bundled sample PDF default,
and add a small compatibility shim for modern APIs used by PDF.js 5.

The sample PDF and source maps from the release archive are intentionally not
kept because they are not needed at runtime.

## Update Steps

1. Download the official generic viewer release from PDF.js GitHub releases.
   For version `5.7.284`, the URL is:
   `https://github.com/mozilla/pdf.js/releases/download/v5.7.284/pdfjs-5.7.284-dist.zip`
2. Extract the archive into a new versioned directory:
   `packages/EdgeTranslate/vendor/pdfjs/<version>`.
3. Remove files that are not needed at extension runtime:
    - `web/compressed.tracemonkey-pldi-09.pdf`
    - `web/viewer.mjs.map`
    - `build/pdf.mjs.map`
    - `build/pdf.sandbox.mjs.map`
    - `build/pdf.worker.mjs.map`
4. Update `PDFJS_VERSION` in
   `packages/EdgeTranslate/scripts/sync-pdfjs-assets.js`.
5. Run `pnpm --dir packages\EdgeTranslate run build`.
6. Check the generated `packages/EdgeTranslate/build/chrome/pdf` output:
    - `pdf/web/viewer.html` exists and contains the Edge Translate script/style
      injection.
    - `pdf/web/viewer.mjs` contains the extension-origin URL validation patch.
    - The sample PDF and source maps are absent.
7. If the new PDF.js release changed `viewer.html` or `viewer.mjs` enough that
   the string replacements fail, update the patch logic in
   `scripts/sync-pdfjs-assets.js` instead of editing files under `vendor`
   directly.

## 中文说明

这个目录保存浏览器插件 PDF 阅读器使用的 PDF.js 官方 generic viewer 发布包。

当前版本：`5.7.284`

来源：

`https://github.com/mozilla/pdf.js/releases/download/v5.7.284/pdfjs-5.7.284-dist.zip`

`vendor/pdfjs/<version>` 下的文件按官方输入文件处理，不直接手改。
Edge Translate 自己的集成逻辑放在 `scripts/sync-pdfjs-assets.js` 里：
构建时先把官方文件复制到扩展输出目录，再对输出文件做少量 patch。

这些输出层 patch 包括：

-   向 `viewer.html` 注入 Edge Translate 的 `select.css`、`select.js` 和
    `display.js`。
-   放开 PDF.js viewer 对扩展页面加载 `file://` PDF 的校验。
-   清空官方示例 PDF 的默认地址。
-   给 PDF.js 5 用到的新 JavaScript API 加少量兼容 shim。

官方 zip 里的示例 PDF 和 source map 没有保留，因为插件运行时不需要。

## 后续更新步骤

1. 到 PDF.js GitHub releases 下载对应版本的 `pdfjs-<version>-dist.zip`。
   以当前版本为例：
   `https://github.com/mozilla/pdf.js/releases/download/v5.7.284/pdfjs-5.7.284-dist.zip`
2. 解压到新的版本目录：
   `packages/EdgeTranslate/vendor/pdfjs/<version>`。
3. 删除插件运行时不需要的文件：
    - `web/compressed.tracemonkey-pldi-09.pdf`
    - `web/viewer.mjs.map`
    - `build/pdf.mjs.map`
    - `build/pdf.sandbox.mjs.map`
    - `build/pdf.worker.mjs.map`
4. 修改 `packages/EdgeTranslate/scripts/sync-pdfjs-assets.js` 里的
   `PDFJS_VERSION`。
5. 运行 `pnpm --dir packages\EdgeTranslate run build`。
6. 检查生成的 `packages/EdgeTranslate/build/chrome/pdf`：
    - `pdf/web/viewer.html` 存在，并且包含 Edge Translate 的脚本和样式注入。
    - `pdf/web/viewer.mjs` 包含扩展页面来源校验 patch。
    - 示例 PDF 和 source map 没有被打进输出目录。
7. 如果新版 PDF.js 的 `viewer.html` 或 `viewer.mjs` 结构变化导致 patch
   失效，只改 `scripts/sync-pdfjs-assets.js` 里的 patch 逻辑，不直接改
   `vendor/pdfjs/<version>` 下的官方文件。
