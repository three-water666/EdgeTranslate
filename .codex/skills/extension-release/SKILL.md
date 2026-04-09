---
name: extension-release
description: Bump and publish the EdgeTranslate browser extension release from this repository. Use when the user wants to publish a new extension version, update the release version number, create the release commit, add a `vX.Y.Z` tag, and push `master` plus the tag so GitHub Actions creates a release artifact.
---

# Extension Release

Update the EdgeTranslate extension version and publish a GitHub release from this repo.

## Workflow

1. Confirm the current branch is `master` and the worktree is clean unless the user explicitly wants to include staged changes.
2. Update `packages/EdgeTranslate/package.json` `version` to the target release version.
3. Do not edit `packages/EdgeTranslate/src/manifest_chrome.json` for the release number. The build copies `manifest_chrome.json` and injects `version` and `version_name` from `packages/EdgeTranslate/package.json` in `packages/EdgeTranslate/gulpfile.js`.
4. Commit the version bump with a clear release-oriented message such as `chore: bump extension version to 3.0.3`.
5. Create a lightweight tag named `vX.Y.Z`.
6. Push `master` and then push the tag to `origin`.
7. Tell the user the commit hash, tag name, and that `.github/workflows/release.yml` should now run.

## Repo Rules

-   The release workflow is triggered only by tags matching `v*`.
-   `.github/workflows/release.yml` verifies that the tag version exactly matches `packages/EdgeTranslate/package.json`.
-   The remote for this repo is `origin` and should point to the GitHub repository that hosts the release workflow.
-   Prefer changing only the extension package version unless the user explicitly asks to version other workspace packages.

## Commands

Use this sequence, adapting only the version number and commit message:

```powershell
git branch --show-current
git status --short
git add packages/EdgeTranslate/package.json
git commit -m "chore: bump extension version to X.Y.Z"
git tag vX.Y.Z
git push origin master
git push origin vX.Y.Z
```

## Checks

-   Before tagging, verify `git tag --list "vX.Y.Z"` is empty.
-   After pushing, report that the user can inspect GitHub Actions and Releases for the automated packaging result.
-   If the worktree is not clean, stop and decide with the user whether to release only the version bump or include the pending changes.
