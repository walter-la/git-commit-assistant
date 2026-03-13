---
name: git-commit-assistant
description: Analyze the current Git working tree, infer change intent, propose a safe atomic commit plan, generate Traditional Chinese commit messages, and optionally stage and commit the changes. Use when the user wants help turning mixed working tree changes into logical commits, wants Traditional Chinese commit messages, wants preview/confirm/auto commit assistance, or needs staged and unstaged changes reviewed before committing.
---

# Git Commit Assistant

Use this skill to turn the current Git working tree into a small set of readable, atomic commits with Traditional Chinese commit messages.

## Defaults

- Default `mode` to `auto`.
- Default `message_style` to `conventional_zh`.
- Default `scope_strategy` to `auto`.
- Default `include_untracked` to `true`.
- Default `allow_hunk_split` to `false`.
- Default `max_commits` to `4`.
- Default `ignore_patterns` to common generated outputs and package lock artifacts only when they are clearly unrelated to the main intent.

## Workflow

1. Run the preflight checks before proposing any commit plan.
2. Collect repository state with the cross-platform Node.js script in `scripts/`.
3. Read focused diffs for files or hunks that look ambiguous.
4. Build commit groups by intent, not just path.
5. Generate Traditional Chinese commit messages.
6. Decide whether to stay in `preview`, ask for confirmation, or execute.
7. Report the plan or the executed commits with reasons and residual risk.

## Preflight Checks

Stop immediately and explain the reason if any of the following is true:

- The current directory is not inside a Git repository.
- `git status --porcelain` shows unresolved conflicts (`UU`, `AA`, `DD`, `AU`, `UA`, `DU`, `UD`).
- There are no staged, unstaged, or eligible untracked changes.
- The working tree is too mixed to split safely and the current mode does not allow a downgrade.

Run these checks first:

```powershell
git rev-parse --show-toplevel
git status --short
```

Then collect the report with the shared script:

```text
node <skill-dir>/scripts/get-git-change-report.js
```

This skill assumes `git` and `node` are available on the host. Do not switch back to host-specific scripts unless the user explicitly wants per-platform maintenance.

## Analysis Rules

- Treat existing staged changes as a user signal, not a command to preserve blindly.
- Prefer grouping by shared intent:
  - feature code with its required tests
  - bug fix with its guard rails
  - docs-only changes together unless topics are clearly separate
  - pure formatter or config churn separate from behavior changes
- Split different intents:
  - feature vs fix
  - behavior change vs docs
  - behavior change vs large formatting-only edits
  - rename/move vs logic changes, when separation is safe
- Use file paths only as hints. Confirm with diff content before grouping.
- Keep commit count small. Merge closely related edits rather than creating brittle micro-commits.

Read [commit-heuristics.md](references/commit-heuristics.md) when classification is uncertain.

## Message Rules

- Write the message in Traditional Chinese.
- Focus on intent, not filenames.
- Prefer verb-led phrasing.
- Avoid vague wording such as `更新內容`, `修改一些東西`, or literal diff narration.
- Use `conventional_zh` unless the user explicitly prefers plain Chinese.

Type mapping:

- `feat`: new user-facing capability
- `fix`: defect fix or behavior correction
- `refactor`: structure cleanup without intended behavior change
- `test`: test-only additions or improvements
- `docs`: documentation-only change
- `chore`: tooling, config, build, dependency, or maintenance work
- `perf`: performance improvement
- `style`: formatting-only changes

Use scope only when it is reliable from module boundaries, for example `fix(auth): 修正 token 過期判斷`.

## Execution Rules

### `preview`

- Do not modify the index.
- Output the proposed commit groups, reasons, and messages.

### `confirm`

- Output the proposed plan first.
- Explain whether current staged content will be reused as-is or regrouped.
- Ask for confirmation only when the user explicitly asks to preview the plan, review commit messages first, or inspect the proposed grouping before committing.

### `auto`

- Execute by default unless the user explicitly asks for `preview` or `confirm`.
- Commit immediately when the split is high-confidence.
- Downgrade to `confirm` when:
  - one file contains multiple intertwined intents
  - binary files carry unclear semantics
  - current staged content appears intentionally curated and conflicts with the inferred grouping
  - the number of logical groups exceeds `max_commits`

If the user asks to "先不要 commit", "先看 commit message", "先看分類", "preview", or any equivalent phrasing, switch to `confirm` or `preview` instead of committing immediately.

## Staging Strategy

- Prefer whole-file staging when a file belongs to exactly one commit.
- Avoid hunk splitting by default.
- Only split hunks when `allow_hunk_split=true` and the patch can be isolated safely.
- If safe hunk splitting is not practical, keep semantic integrity and downgrade instead of forcing a split.

Preferred command patterns:

```powershell
git add -- <paths>
git restore --staged -- <paths>
git commit -m "<message>"
```

If you must isolate hunks non-interactively, create a temporary patch and apply it with `git apply --cached`, then delete the temporary patch after use.

## Response Contract

Always tell the user:

- what themes were detected
- how many commits are recommended
- which files belong to each commit group
- why each group exists
- the proposed or executed Traditional Chinese commit message
- what was skipped, downgraded, or left uncommitted

Use this structure:

```text
建議拆成 N 個 commits
Commit 1：<message>
包含：<files or hunks>
理由：<why this is one unit>
風險：<optional>
```

For executed runs, append:

```text
已建立 N 個 commits
<message 1>
<message 2>
未提交內容：<if any>
```

## Safety Boundaries

- Never commit through conflicts.
- Never silently discard user staging choices.
- Never force a low-confidence split just to maximize atomicity.
- Prefer an honest downgrade over an incorrect commit.
