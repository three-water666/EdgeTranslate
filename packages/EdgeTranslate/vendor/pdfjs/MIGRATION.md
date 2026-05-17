# PDF.js Viewer Migration Notes

## Background

Edge Translate can open local PDFs with PDF.js and reuse the extension's
existing selection translation and display logic inside PDF pages. The old
implementation stored PDF.js viewer files directly under `static/pdf` and mixed
extension-specific changes into those files.

The first migration moved this area to official inputs under
`vendor/pdfjs/<version>` plus build-time patches. This follow-up narrows the
vendor tree further: official runtime assets that can be resolved reliably from
npm are no longer committed again under `vendor/pdfjs/<version>`.

## Why pdfjs-dist Is Not Enough

`pdfjs-dist@5.7.284` contains these runtime assets:

-   `build/pdf.mjs`
-   `build/pdf.sandbox.mjs`
-   `build/pdf.worker.mjs`
-   `cmaps`
-   `iccs`
-   `standard_fonts`
-   `wasm`
-   `web/images`

It does not contain the complete official viewer app:

-   No `web/viewer.html`
-   No `web/viewer.mjs`
-   No `web/viewer.css`
-   No `web/locale`

The extension currently keeps the official PDF.js UI, so it cannot rely only on
`pdfjs-dist`. Using only the `pdf_viewer.mjs` component would mean maintaining a
custom viewer page, which has a larger maintenance cost and risk.

## New Approach

The sources are now split into two layers:

-   `pdfjs-dist` npm package: library runtime, worker, fonts, cmaps, wasm, and
    image assets.
-   `vendor/pdfjs/<version>`: complete viewer app files missing from the npm
    package.

The build flow is:

1. Read the actual installed `pdfjs-dist` version.
2. Use that version to locate `vendor/pdfjs/<version>`.
3. Copy `viewer.html`, `viewer.mjs`, `viewer.css`, `debugger.*`, and `locale`
   from vendor.
4. Copy the `build` runtime, `cmaps`, `iccs`, `standard_fonts`, `wasm`, and
   `web/images` from `pdfjs-dist`.
5. Apply Edge Translate patches only to the build output.

The patching remains output-only and does not modify official input files.

## Changes In This Migration

-   Add `pdfjs-dist@5.7.284` as the PDF.js runtime asset source.
-   Update `scripts/sync-pdfjs-assets.js` to combine `pdfjs-dist` with the
    vendor viewer app files.
-   Remove duplicate directories from `vendor/pdfjs/5.7.284` that are already
    provided by the npm package: `build`, `web/cmaps`, `web/iccs`,
    `web/images`, `web/standard_fonts`, and `web/wasm`.
-   Keep `viewer.html`, `viewer.mjs`, `viewer.css`, `debugger.*`, `locale`,
    and `LICENSE`.

## Future Update Steps

1. Upgrade `pdfjs-dist` in `packages/EdgeTranslate/package.json`.
2. Download the matching `pdfjs-<version>-dist.zip` from PDF.js GitHub releases.
3. Copy only the required complete viewer app files to
   `vendor/pdfjs/<version>`:
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
6. Check the generated `build/chrome/pdf` output:
    - `web/viewer.html` has the extension script and style injection.
    - `web/viewer.mjs` has the extension-origin validation patch.
    - `build/pdf.worker.mjs`, `web/cmaps`, `web/wasm`, and other runtime
      assets exist.

## Summary

This migration does not move PDF.js out of the extension package. At runtime,
the extension still uses locally bundled PDF.js files.

The actual change is clearer official asset ownership:

-   Runtime assets that can be managed through npm are copied from
    `pdfjs-dist`.
-   Complete viewer app files missing from the npm package stay in vendor.
-   Edge Translate integration logic stays centralized in the build script and
    patches only the output directory.
