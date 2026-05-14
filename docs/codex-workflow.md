# Codex Workflow

This project is designed to be developed with Codex in small, reviewable steps.

## Core Rules

- Work one GitHub Issue at a time.
- Create a working branch for each Issue.
- Branch names must use this format:

```txt
feature/#<issue-number>
```

Example:

```txt
feature/#12
```

- Confirm changes locally with the user before pushing.
- Do not push or deploy until the user says OK.
- Do not add unrequested features.
- Do not silently change gameplay specs.
- Ask or propose before making UI/UX changes that affect feel, layout, controls, or presentation.
- Keep unrelated files out of the commit.
- Do not revert user changes unless explicitly requested.

## Standard Flow

1. Check the target Issue.
2. Create or switch to the Issue branch.
3. Implement only the requested scope.
4. Run local checks.
5. Start the local dev server when visual confirmation is needed.
6. Let the user confirm in the browser.
7. After user approval, commit.
8. Merge or push as requested.
9. Deploy to GitHub Pages only after user approval.
10. Comment the Issue with a concise summary.
11. Close the Issue.

## Local Confirmation

Before push or deploy, confirm:

- The user can view the change locally.
- The browser console has no relevant errors.
- The change matches the user's requested direction.
- UI changes have been visually checked.
- Mobile behavior is checked when the change affects layout, input, or scale.

## Issue Completion Comment Format

Use this format when closing an Issue:

```md
## 対応内容

* 
* 
* 

## 変更ファイル

* 
* 

## 確認項目

* [x] PC動作確認
* [x] スマホ動作確認
* [x] コンソールエラーなし

## 補足

* 
```

## Push / Deploy Rule

Do not push or deploy automatically.

Push and GitHub Pages deployment should happen only after the user says something like:

- `OK`
- `pushお願い`
- `GitHub Pagesまでお願い`
- `アップして`

## UI Adjustment Rule

For UI, controls, animations, and game feel:

- Make one focused change at a time.
- Let the user check it locally.
- Iterate from user feedback.
- Avoid adding new UI concepts without confirmation.

## Recommended Verification

Run at least:

```bash
npm run lint
```

When changing build config, routing, asset paths, or deployment:

```bash
npm run build
```

## Git Hygiene

- Keep commits focused.
- Do not include generated build output.
- Do not include unrelated notes unless requested.
- Leave unrelated untracked files alone.
- If the worktree has unexpected changes, inspect before editing the same files.
