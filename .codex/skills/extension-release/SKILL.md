---
name: extension-release
description: Bump and publish the EdgeTranslate browser extension release from this repository. Use when the user wants to publish a new extension version, generate AI changelog files from commits since the previous `v*` tag, update the release version number, create the release commit, add a `vX.Y.Z` tag, and push `master` plus the tag so GitHub Actions creates a release artifact.
---

# Extension Release

Update the EdgeTranslate extension version, write release changelogs, and publish a GitHub release from this repo.

## Workflow

1. Confirm the current branch is `master` and the worktree is clean unless the user explicitly wants to include staged changes.
2. Confirm the target release version `X.Y.Z` and verify the tag `vX.Y.Z` does not already exist.
3. Find the previous release tag with `git tag --list "v*" --sort=-v:refname | head -n 1`.
4. Review commits from the previous tag to current `HEAD` using `git log --reverse --format='%h %s%n%b' "${PREVIOUS_TAG}..HEAD"` and inspect details as needed with `git show --stat` or `git log --stat`. Do not drop merge commits by default because they may contain PR numbers or issue references.
5. Generate AI-written changelogs for the target version from those commits:
    - `docs/changelog/zh-CN/vX.Y.Z.md`
    - `docs/changelog/en/vX.Y.Z.md`
    - `docs/changelog/zh-TW/vX.Y.Z.md`
6. Stop and ask the user to review the three changelog files. Do not continue the release workflow until the user explicitly says to continue.
7. After the user approves the changelog files, update `packages/EdgeTranslate/package.json` `version` to the target release version.
8. Do not edit `packages/EdgeTranslate/src/manifest_chrome.json` for the release number. The build copies `manifest_chrome.json` and injects `version` and `version_name` from `packages/EdgeTranslate/package.json` in `packages/EdgeTranslate/gulpfile.js`.
9. Commit the changelog files and version bump with a clear release-oriented message such as `chore: release 3.0.3`.
10. Create a lightweight tag named `vX.Y.Z`.
11. Push `master` and then push the tag to `origin`.
12. Tell the user the commit hash, tag name, and that `.github/workflows/release.yml` should now run.

## Changelog Rules

-   Base the changelog only on changes between the previous release tag and the commit that is current before the release bump.
-   Write user-facing release notes. Group entries into concise sections such as features, improvements, fixes, and maintenance when those sections are relevant.
-   Do not include raw commit hashes, internal-only noise, dependency churn, or release bump/tag mechanics unless they materially affect users or maintainers.
-   Preserve meaningful issue and PR references found in the commit subject/body, such as `#123`, `PR #123`, `Fixes #123`, or `Closes #123`, and attach them to the relevant changelog bullet.
-   Do not invent changes. If a commit is ambiguous, inspect the diff before summarizing it.
-   Keep the three language files equivalent in meaning:
    -   `zh-CN`: Simplified Chinese.
    -   `en`: English.
    -   `zh-TW`: Traditional Chinese.
-   Use the tag name as the filename, including the `v` prefix, for example `v3.1.1.md`.

## Repo Rules

-   The release workflow is triggered only by tags matching `v*`.
-   `.github/workflows/release.yml` verifies that the tag version exactly matches `packages/EdgeTranslate/package.json`.
-   `.github/workflows/release.yml` requires all three changelog files for the tag version and uses them as the GitHub Release body. It does not generate release notes from GitHub PR metadata.
-   The remote for this repo is `origin` and should point to the GitHub repository that hosts the release workflow.
-   Prefer changing only the extension package version unless the user explicitly asks to version other workspace packages.

## Commands

Use this sequence, adapting only the version number and commit message:

```powershell
git branch --show-current
git status --short
git tag --list "vX.Y.Z"
git tag --list "v*" --sort=-v:refname | head -n 1
git log --reverse --format="%h %s%n%b" vPREVIOUS..HEAD
git add packages/EdgeTranslate/package.json docs/changelog/zh-CN/vX.Y.Z.md docs/changelog/en/vX.Y.Z.md docs/changelog/zh-TW/vX.Y.Z.md
git commit -m "chore: release X.Y.Z"
git tag vX.Y.Z
git push origin master
git push origin vX.Y.Z
```

## Checks

-   Before tagging, verify `git tag --list "vX.Y.Z"` is empty.
-   Before committing, verify the changelog files exist at all three expected paths and describe the same release.
-   After generating changelog files and before changing the package version, ask the user to review them and wait for explicit confirmation to continue.
-   After pushing, report that the user can inspect GitHub Actions and Releases for the automated packaging result.
-   If the worktree is not clean at the start, stop and decide with the user whether to release the pending changes or postpone the release.
