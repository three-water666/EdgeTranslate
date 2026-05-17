# PDF.js Assets

This directory stores the PDF.js files that are not shipped by the `pdfjs-dist`
npm package but are still required by Edge Translate's PDF viewer.

Current version: `5.7.284`

Sources:

-   `pdfjs-dist@5.7.284` in `packages/EdgeTranslate/package.json`
-   PDF.js generic viewer release:
    `https://github.com/mozilla/pdf.js/releases/download/v5.7.284/pdfjs-5.7.284-dist.zip`

`pdfjs-dist` contains the library runtime, worker, cmaps, fonts, wasm decoders,
and viewer images. It does not contain the complete generic viewer application
files such as `web/viewer.html`, `web/viewer.mjs`, `web/viewer.css`, or the
viewer locale directory. Those files stay in `vendor/pdfjs/<version>`.

Do not edit files under a versioned directory directly. Edge Translate
integration logic belongs in `scripts/sync-pdfjs-assets.js`, which combines the
npm package assets and the viewer app vendor files into the extension build
output, then applies small output-only patches for extension use.

## Current Layout

-   `vendor/pdfjs/<version>/web/viewer.html`
-   `vendor/pdfjs/<version>/web/viewer.mjs`
-   `vendor/pdfjs/<version>/web/viewer.css`
-   `vendor/pdfjs/<version>/web/debugger.*`
-   `vendor/pdfjs/<version>/web/locale`
-   `vendor/pdfjs/<version>/LICENSE`

The following runtime assets are generated from `pdfjs-dist` during build:

-   `pdf/build/pdf.mjs`
-   `pdf/build/pdf.sandbox.mjs`
-   `pdf/build/pdf.worker.mjs`
-   `pdf/web/cmaps`
-   `pdf/web/iccs`
-   `pdf/web/images`
-   `pdf/web/standard_fonts`
-   `pdf/web/wasm`

## Update Steps

1. Update `pdfjs-dist` in `packages/EdgeTranslate/package.json`.
2. Download the matching generic viewer release from PDF.js GitHub releases.
   For version `5.7.284`, the URL is:
   `https://github.com/mozilla/pdf.js/releases/download/v5.7.284/pdfjs-5.7.284-dist.zip`
3. Extract only the viewer app files into
   `packages/EdgeTranslate/vendor/pdfjs/<version>`:
    - `LICENSE`
    - `web/viewer.html`
    - `web/viewer.mjs`
    - `web/viewer.css`
    - `web/debugger.css`
    - `web/debugger.mjs`
    - `web/locale`
4. Do not copy `build`, `web/cmaps`, `web/iccs`, `web/images`,
   `web/standard_fonts`, or `web/wasm`; those come from `pdfjs-dist`.
5. Run `pnpm --dir packages\EdgeTranslate run build`.
6. Check the generated `packages/EdgeTranslate/build/chrome/pdf` output:
    - `pdf/web/viewer.html` contains the Edge Translate script/style injection.
    - `pdf/web/viewer.mjs` contains the extension-origin URL validation patch.
    - `pdf/build/pdf.worker.mjs` and runtime asset directories exist.
7. If the new PDF.js release changed `viewer.html` or `viewer.mjs` enough that
   the string replacements fail, update `scripts/sync-pdfjs-assets.js`.
