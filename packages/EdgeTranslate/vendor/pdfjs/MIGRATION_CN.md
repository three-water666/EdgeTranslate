# PDF.js Viewer 迁移说明

## 背景

Edge Translate 支持用 PDF.js 打开本地 PDF，并在 PDF 页面里复用插件已有的
划词翻译和显示逻辑。旧实现把 PDF.js viewer 文件直接放在 `static/pdf` 目录下，
同时在这些文件里加入插件自己的改动。

第一次迁移已经把这块改成了 `vendor/pdfjs/<version>` 官方输入加构建期 patch。
这次继续收敛结构：能从 npm 包稳定取得的官方运行时资产，不再重复提交到
`vendor/pdfjs/<version>`。

## 为什么不能完全只用 pdfjs-dist

`pdfjs-dist@5.7.284` 有这些运行时资产：

-   `build/pdf.mjs`
-   `build/pdf.worker.mjs`
-   `cmaps`
-   `iccs`
-   `standard_fonts`
-   `wasm`
-   `web/images`

但它没有完整官方 viewer app：

-   没有 `web/viewer.html`
-   没有 `web/viewer.mjs`
-   没有 `web/viewer.css`
-   没有 `web/locale`

插件现在需要保留 PDF.js 官方完整 UI，所以不能纯靠 `pdfjs-dist`。如果只使用
`pdf_viewer.mjs` 组件，就等于要自己维护一套 viewer 页面，风险和工作量都更大。

## 新方案

现在的来源被拆成两层：

-   `pdfjs-dist` npm 包：提供库运行时、worker、字体、cmaps、wasm、图片等资产。
    PDF.js scripting sandbox 会被刻意省略，因为 Edge Translate 不需要执行 PDF
    文档内嵌 JavaScript。
-   `vendor/pdfjs/<version>`：只保留 npm 包缺失的完整 viewer app 文件。

构建流程是：

1. 读取 `pdfjs-dist` 的实际版本号。
2. 用这个版本号定位 `vendor/pdfjs/<version>`。
3. 从 vendor 复制 `viewer.html`、`viewer.mjs`、`viewer.css`、`debugger.*` 和
   `locale`。
4. 从 `pdfjs-dist` 复制需要的 `build` 运行时、`cmaps`、`iccs`、
   `standard_fonts`、`wasm` 和 `web/images`。
5. 对构建输出打 Edge Translate 需要的 patch。

patch 仍然只发生在输出目录，不直接修改官方输入文件。

## 本次调整内容

-   新增 `pdfjs-dist@5.7.284` 作为 PDF.js runtime 资产来源。
-   `scripts/sync-pdfjs-assets.js` 改为组合 `pdfjs-dist` 和 vendor viewer app。
-   删除 `vendor/pdfjs/5.7.284` 中已经由 npm 包提供的重复目录：
    `build`、`web/cmaps`、`web/iccs`、`web/images`、`web/standard_fonts`、
    `web/wasm`。
-   保留 `viewer.html`、`viewer.mjs`、`viewer.css`、`debugger.*`、`locale` 和
    `LICENSE`。
-   从扩展输出中省略 `pdf.sandbox.mjs`，并 patch viewer 让 PDF scripting 保持禁用。

## 后续更新步骤

1. 升级 `packages/EdgeTranslate/package.json` 里的 `pdfjs-dist`。
2. 到 PDF.js GitHub releases 下载同版本 `pdfjs-<version>-dist.zip`。
3. 只复制完整 viewer app 必需文件到 `vendor/pdfjs/<version>`：
    - `LICENSE`
    - `web/viewer.html`
    - `web/viewer.mjs`
    - `web/viewer.css`
    - `web/debugger.css`
    - `web/debugger.mjs`
    - `web/locale`
4. 不复制 `build`、`web/cmaps`、`web/iccs`、`web/images`、`web/standard_fonts`、
   `web/wasm`，这些由 `pdfjs-dist` 提供。
5. 运行 `pnpm --dir packages\EdgeTranslate run build`。
6. 检查输出目录 `build/chrome/pdf`：
    - `web/viewer.html` 有插件脚本和样式注入。
    - `web/viewer.mjs` 有扩展来源校验 patch，并禁用 PDF scripting。
    - `build/pdf.worker.mjs`、`web/cmaps`、`web/wasm` 等运行时资产存在。

## 总结

这次迁移不是把 PDF.js 从扩展包里移出去。插件运行时仍然使用本地打包的 PDF.js。

真正变化是官方资产来源更清晰：

-   能用 npm 包管理的 runtime 资产从 `pdfjs-dist` 复制。
-   npm 包缺失的完整 viewer app 文件保留在 vendor。
-   Edge Translate 的适配逻辑继续集中在构建脚本里，只 patch 输出目录。
