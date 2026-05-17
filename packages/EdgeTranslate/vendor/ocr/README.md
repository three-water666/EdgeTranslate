# OCR runtime 资产说明

OCR 截图识别使用 `tesseract.js`，项目代码只直接调用它的 `createWorker` API。
浏览器扩展运行时还需要单独可访问的 worker 和 wasm core 文件，这些文件来自
`tesseract.js` 与 `tesseract.js-core` npm 包。

## 当前结构

-   `packages/EdgeTranslate/src/offscreen/ocr.js`
    -   项目自研 OCR 调度、语言包缓存、截图裁剪和识别入口。
    -   继续通过 `chrome.runtime.getURL("ocr/...")` 访问构建产物。
-   `packages/EdgeTranslate/scripts/sync-ocr-assets.js`
    -   构建时从 npm 包复制官方 runtime 文件到 `build/<browser>/ocr/` 或
        `dev/<browser>/ocr/`。
-   `packages/EdgeTranslate/static/ocr`
    -   不再存放官方 runtime 文件，避免官方包产物和项目静态资源混在一起。

## 迁移原因

之前 `static/ocr` 中直接提交了 `worker.min.js`、`tesseract-core-*.wasm` 和
`*.wasm.js`。这些文件本质上是官方包产物，但会被当成项目静态文件复制和压缩，
来源、版本和更新方式都不够清晰。

现在改为依赖 npm 包作为唯一来源，构建时同步必要文件。这样和 PDF.js、Google
Translate Element 的处理方式保持一致：官方 runtime 与项目代码分离，构建输出再
组合成浏览器扩展需要的目录结构。

## 构建输出

当前只复制 `tesseract.js` 默认 LSTM core 实际使用到的文件：

-   `ocr/worker.min.js`
-   `ocr/worker.min.js.LICENSE.txt`
-   `ocr/core/tesseract-core-lstm.wasm`
-   `ocr/core/tesseract-core-lstm.wasm.js`

`src/offscreen/ocr.js` 目前固定传入：

```js
workerPath: chrome.runtime.getURL("ocr/worker.min.js");
corePath: chrome.runtime.getURL("ocr/core/tesseract-core-lstm.wasm.js");
```

所以 SIMD core 文件没有复制进扩展包。后续如果要启用 Tesseract 的自动 SIMD core
选择，需要把 `corePath` 改成 core 目录，并同步补齐 `simd`、`relaxedsimd` 等 core
文件。

## 语言包

OCR 语言包不随扩展内置。设置页下载语言包时，会从
`https://cdn.jsdelivr.net/npm/@tesseract.js-data/<language>/<version>/` 下载
`*.traineddata.gz`，然后写入 IndexedDB 缓存。手动上传的语言包也写入同一缓存。

## 更新步骤

1. 同步升级 `packages/EdgeTranslate/package.json` 里的 `tesseract.js` 和
   `tesseract.js-core`，两个版本建议保持一致。
2. 运行依赖安装命令更新 `pnpm-lock.yaml`。
3. 检查 `scripts/sync-ocr-assets.js` 中的文件名是否仍然存在于新版本 npm 包。
4. 运行 `pnpm --dir packages\EdgeTranslate run build`。
5. 检查 `build/chrome/ocr/` 是否生成 worker 与 core 文件。
6. 在扩展里验证截图翻译能正常识别已下载或手动上传的语言包。
