# PDF.js Viewer 迁移说明

## 背景

Edge Translate 支持用 PDF.js 打开本地 PDF，并在 PDF 页面里复用插件已有的
划词翻译和显示逻辑。旧实现把 PDF.js viewer 文件直接放在 `static/pdf`
目录下，同时在这些文件里加入了插件自己的改动。

这种方式可以工作，但维护成本比较高：

-   很难一眼判断某个文件是 PDF.js 官方文件、插件自写文件，还是官方文件上
    做过本地修改。
-   PDF.js 版本较旧，升级时需要手工覆盖大量文件，并重新找回本地改动。
-   官方 viewer UI 和插件注入逻辑混在一起，代码审查时需要在大体量 vendor
    文件里分辨业务逻辑。
-   `static/pdf` 同时承担源码输入和运行时输出的角色，边界不清晰。

## 迁移目标

这次迁移的目标不是让插件运行时从远程加载 PDF.js。浏览器扩展仍然需要把
PDF.js 文件打包到本地，避免远程脚本和扩展 CSP 限制带来的问题。

真正要解决的是代码边界和升级方式：

-   官方 PDF.js 文件作为第三方 vendor 输入单独存放。
-   Edge Translate 的集成逻辑集中放在构建脚本里。
-   构建输出可以重复生成，避免直接修改官方文件。
-   保留 PDF.js 官方 viewer UI，而不是维护一套简化版自定义 viewer。

## 新方案

新的目录和职责如下：

-   `vendor/pdfjs/<version>`：存放 PDF.js 官方 generic viewer release 文件。
-   `vendor/pdfjs/README.md`：记录当前版本、来源和后续升级步骤。
-   `scripts/sync-pdfjs-assets.js`：构建时复制 PDF.js vendor 文件，并对输出文件
    应用 Edge Translate 需要的少量 patch。
-   `build/chrome/pdf` 或 `dev/chrome/pdf`：最终扩展运行时使用的 PDF.js 输出文件。

构建流程变为：

1. 从 `vendor/pdfjs/<version>` 复制官方 PDF.js 文件到扩展输出目录 `pdf/`。
2. 跳过 source map 和官方示例 PDF 等运行时不需要的文件。
3. 修改输出目录里的 `viewer.html`，注入 Edge Translate 的样式和脚本。
4. 修改输出目录里的 `viewer.mjs`，允许扩展页面加载传入的本地 PDF 地址。
5. 给输出的 PDF.js 文件加少量兼容 shim，兼容 PDF.js 5 使用的新 JavaScript API。

注意：patch 只应用在构建输出目录，不直接修改 `vendor/pdfjs/<version>` 下的
官方文件。

## 本次迁移内容

本次迁移将 PDF.js 升级到官方 release `5.7.284`，来源为：

`https://github.com/mozilla/pdf.js/releases/download/v5.7.284/pdfjs-5.7.284-dist.zip`

同时做了这些结构调整：

-   移除旧的 `static/pdf` PDF.js 文件。
-   新增 `vendor/pdfjs/5.7.284` 作为官方 vendor 输入。
-   新增 `scripts/sync-pdfjs-assets.js` 作为 PDF.js 构建同步和 patch 层。
-   `gulp build` 和 `gulp dev` 接入 `pdfViewer` 任务，自动生成 PDF.js 输出。
-   PDF 跳转路径从 `pdf/viewer.html` 改为官方 viewer 结构：
    `pdf/web/viewer.html`。
-   `package.json` 的 lint 范围加入 `scripts/**/*.js`，让新增构建脚本也被检查。

## 与旧方案的区别

旧方案和新方案的共同点是：PDF.js 最终仍然随扩展一起打包到本地。

核心区别在于：

-   旧方案直接在本地 PDF.js 文件上改。
-   新方案保留一份相对干净的官方 vendor 输入，对构建输出打 patch。
-   旧方案的官方代码和插件代码混在 `static/pdf`。
-   新方案把官方代码放在 `vendor/pdfjs/<version>`，插件适配放在
    `scripts/sync-pdfjs-assets.js`。
-   旧方案升级时需要手工辨别和迁移本地改动。
-   新方案升级时主要替换 vendor 版本，并检查同步脚本里的 patch 是否仍然适用。

## 取舍

这个方案仍然会把完整 PDF.js viewer 放进仓库和插件包，所以 vendor 文件数量
不会变少。它解决的是维护问题，不是包体积问题。

选择官方 generic viewer release，而不是只引入 `pdfjs-dist` npm 包，是因为
插件需要的是完整 viewer UI。`pdfjs-dist` 更适合作为渲染库使用，但官方完整
viewer 的 HTML、样式、图片、语言包、字体、wasm 等运行时资源仍然需要纳入
扩展包。

如果后续要继续优化包体积，可以在确认功能影响后再考虑裁剪语言包、调试文件
或部分非必要资源。这类裁剪应记录在 `README.md` 的升级步骤里，避免未来升级时
遗漏。

## 总结

这次迁移把 PDF.js 从“直接混在 `static/pdf` 里维护”改成了“官方 vendor 输入
加构建期 patch”的模式。

迁移后的维护原则是：

-   不直接修改 `vendor/pdfjs/<version>` 下的官方文件。
-   Edge Translate 的 PDF.js 集成逻辑统一写在 `scripts/sync-pdfjs-assets.js`。
-   升级 PDF.js 时新增版本目录，更新 `PDFJS_VERSION`，重新 build 并检查输出。
-   如果官方 viewer 结构变化导致 patch 失效，修同步脚本，不手改官方文件。
