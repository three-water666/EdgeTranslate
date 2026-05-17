# Google Translate Element assets

这个目录保存 Edge Translate 的 Google 全页翻译运行时快照。

## 当前结构

-   `current-version.txt`: 当前构建使用的快照名。
-   `TE_20230726/`: 当前使用的 Google Translate Element 快照。
-   `TE_20230726/element_main.js`: Google Translate Element 主运行时代码。
-   `TE_20230726/element_main.css`: Google Translate Element 样式。
-   `TE_20230726/elms/`: 每个界面语言对应的 Element bootstrap 脚本。
-   `TE_20230726/lans/`: 每个界面语言对应的语言名数据。

扩展自己写的 Google 全页翻译入口脚本放在 `src/content/page_translate/google/`：

-   `init.js`: content script 侧入口，读取用户语言并注入页面脚本。
-   `injection.js`: 页面上下文入口，创建 `google.translate.TranslateElement`。

## 和 PDF.js 的区别

PDF.js 有明确的开源发布包，可以直接按版本保存官方 release。Google Translate
Element 没有面向浏览器插件的 npm 包或版本化 release，这里的资源来自 Google 线上
Translate Element / Translate API widget 资源快照。

因此这个目录是“可追踪的第三方运行时快照”，不是 Google 官方发布包。构建层会把快照
复制到最终扩展产物，并在输出目录中修正 Element bootstrap 脚本的资源路径。

## 构建流程

`scripts/sync-google-translate-assets.js` 会在 `gulp dev` 和 `gulp build` 中执行：

1. 读取 `vendor/google-translate-element/current-version.txt`，找到当前快照目录。
2. 复制当前快照目录到输出目录的 `google/`。
3. 处理 `google/elms/elm_*.js`，确保它们加载扩展内的：
    - `google/element_main.css`
    - `google/element_main.js`
    - `google/lans/lan_*.js`

`packStatic` 会把 `src/content/page_translate/google/*.js` 输出到扩展产物的 `google/` 下。
这样 `static/google` 不再混放第三方大文件和自有入口脚本，打包入口也能清楚区分
自有代码和第三方快照。

## 后续更新步骤

1. 确认 Google 当前是否仍没有合适的官方包或 SDK。如果出现官方包，优先迁移到官方包。
2. 在 `packages/EdgeTranslate` 目录下运行 `node utils/get_google_page_translator.js`。
   如果需要代理，可以先设置 `ALL_PROXY`。
3. 脚本会先请求 `element.js`，从 `_exportVersion(...)` 中解析快照名，写入对应的
   `vendor/google-translate-element/<snapshot>/elms` 和
   `vendor/google-translate-element/<snapshot>/lans`，并更新 `current-version.txt`。
4. 如 Google 更新了 `element_main.js` 或 `element_main.css`，从当前 Element 资源链路中
   重新获取这两个文件，并放入新的快照目录。
5. 保留 `src/content/page_translate/google/init.js` 和
   `src/content/page_translate/google/injection.js` 作为自有源码，不要移入快照目录。
6. 运行 `pnpm --dir packages\EdgeTranslate run build`，检查输出目录中是否生成
   `google/element_main.js`、`google/elms/` 和 `google/lans/`。

不要让格式化、lint、EOL 检查处理 `vendor/google-translate-element/<snapshot>/` 下的文件；
这些文件由 staged-file filters 按版本化 vendor 路径跳过。
