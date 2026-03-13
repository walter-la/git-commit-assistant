# Git Commit Assistant

`git-commit-assistant` 是一個用來分析 Git 工作樹、推斷變更意圖、規劃原子化 commits，並產生繁體中文 commit message 的 Codex skill。

它適合用在以下情境：

- 工作樹混有多種修改，需要拆成合理 commits
- 需要 Traditional Chinese 的 Conventional Commit 訊息
- 想先看提交分組與訊息，再決定是否 commit
- 想讓 agent 在高信心情況下自動完成 stage 與 commit

## 功能

- 檢查 repository 狀態與 merge conflicts
- 掃描 staged、unstaged、untracked 變更
- 依「意圖」而不是單純依路徑分組 commits
- 產生繁體中文 Conventional Commit 訊息
- 視情況選擇 `preview`、`confirm` 或 `auto`
- 在低信心情況下降級，避免錯誤拆分或錯誤提交

## 內含檔案

- `SKILL.md`: skill 行為、工作流程與安全邊界
- `agents/openai.yaml`: skill 顯示名稱與預設提示
- `references/commit-heuristics.md`: 分組判斷的補充規則
- `scripts/get-git-change-report.js`: 跨平台 Git 變更報告腳本

## 預設行為

- 預設模式是 `auto`
- 預設訊息格式是 `conventional_zh`
- 預設會納入 untracked 檔案
- 預設不做 hunk split
- 預設最多規劃 `4` 個 commits

當變更可以高信心拆分時，skill 會直接執行提交；如果使用者明確要求先看方案，或變更內容太混雜，則會改成 `confirm` 或 `preview`。

## 工作流程

1. 檢查目前目錄是否在 Git repository 內
2. 檢查是否有 unresolved conflicts
3. 用 `scripts/get-git-change-report.js` 收集工作樹狀態
4. 針對模糊檔案補讀 diff
5. 依共享意圖建立 commit groups
6. 產生繁體中文 commit messages
7. 回報方案，或在高信心時直接提交

## 需要的環境

- `git`
- `node`

此 skill 依賴 Node.js 腳本讀取 Git 狀態，不建議改回平台綁定的 shell-only 實作。

## 產出風格

commit message 採用繁體中文 Conventional Commit，例如：

- `feat: 新增批次提交規劃流程`
- `fix: 修正已暫存內容誤判問題`
- `docs: 更新提交策略說明`

skill 會避免使用模糊描述，例如 `更新內容`、`修改一些東西` 這類低資訊訊息。

## 安全原則

- 不在 conflict 狀態下提交
- 不默默覆寫使用者已安排好的 staged 內容
- 不為了追求原子化而強行切出低信心 commits
- 遇到混雜變更時，優先降級而不是亂 commit

## 適用方式

如果你要讓 Codex 使用這個 skill，可以直接要求它：

```text
Use $git-commit-assistant to analyze the current Git working tree and commit the changes.
```

如果你只想先看規劃，也可以明確說：

```text
Use $git-commit-assistant, but preview the commit groups first.
```
