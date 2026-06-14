# PDF.js 资产说明

这个目录保存 `pdfjs-dist` npm 包没有提供、但 Edge Translate 的 PDF viewer
仍然需要的 PDF.js 文件。

当前版本：`5.7.284`

来源：

-   `packages/EdgeTranslate/package.json` 里的 `pdfjs-dist@5.7.284`
-   PDF.js 官方 generic viewer release：
    `https://github.com/mozilla/pdf.js/releases/download/v5.7.284/pdfjs-5.7.284-dist.zip`

`pdfjs-dist` 提供库运行时、worker、sandbox bundle、cmaps、字体、wasm 解码器和
viewer 图片。Edge Translate 只复制 PDF 查看和翻译需要的运行时文件；PDF.js
scripting sandbox 不会打包，因为插件不需要执行 PDF 文档内嵌 JavaScript。它不提供
完整 generic viewer app 文件，例如 `web/viewer.html`、`web/viewer.mjs`、
`web/viewer.css` 和 viewer locale 目录。这些文件继续保留在
`vendor/pdfjs/<version>`。

不要直接修改版本目录下的文件。Edge Translate 的集成逻辑放在
`scripts/sync-pdfjs-assets.js` 里：构建时把 npm 包资产和 vendor viewer app
文件组合到扩展输出目录，再对输出目录打少量扩展适配 patch。

## 当前结构

-   `vendor/pdfjs/<version>/web/viewer.html`
-   `vendor/pdfjs/<version>/web/viewer.mjs`
-   `vendor/pdfjs/<version>/web/viewer.css`
-   `vendor/pdfjs/<version>/web/debugger.*`
-   `vendor/pdfjs/<version>/web/locale`
-   `vendor/pdfjs/<version>/LICENSE`

以下运行时资产在构建时从 `pdfjs-dist` 生成：

-   `pdf/build/pdf.mjs`
-   `pdf/build/pdf.worker.mjs`
-   `pdf/web/cmaps`
-   `pdf/web/iccs`
-   `pdf/web/images`
-   `pdf/web/standard_fonts`
-   `pdf/web/wasm`

`pdf/build/pdf.sandbox.mjs` 会被刻意省略，并且 `web/viewer.mjs` 会被 patch 为
禁用 PDF scripting。

## 更新步骤

1. 升级 `packages/EdgeTranslate/package.json` 里的 `pdfjs-dist`。
2. 从 PDF.js GitHub releases 下载匹配版本的 generic viewer release。
   例如版本 `5.7.284` 的地址是：
   `https://github.com/mozilla/pdf.js/releases/download/v5.7.284/pdfjs-5.7.284-dist.zip`
3. 只把 viewer app 文件解压到
   `packages/EdgeTranslate/vendor/pdfjs/<version>`：
    - `LICENSE`
    - `web/viewer.html`
    - `web/viewer.mjs`
    - `web/viewer.css`
    - `web/debugger.css`
    - `web/debugger.mjs`
    - `web/locale`
4. 不复制 `build`、`web/cmaps`、`web/iccs`、`web/images`、
   `web/standard_fonts`、`web/wasm`；这些由 `pdfjs-dist` 提供。
5. 运行 `pnpm --dir packages\EdgeTranslate run build`。
6. 检查生成的 `packages/EdgeTranslate/build/chrome/pdf` 输出：
    - `pdf/web/viewer.html` 包含 Edge Translate 的脚本和样式注入。
    - `pdf/web/viewer.mjs` 包含扩展来源 URL 校验 patch，并禁用 PDF scripting。
    - `pdf/build/pdf.worker.mjs` 和运行时资产目录存在。
7. 如果新的 PDF.js release 导致 `viewer.html` 或 `viewer.mjs` 的字符串替换失败，
   更新 `scripts/sync-pdfjs-assets.js`。
