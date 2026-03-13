# Commit Heuristics

Use this reference only when the grouping is ambiguous.

## Grouping Order

1. Resolve safety first: conflicts, binary ambiguity, huge mixed diffs.
2. Separate obvious non-code buckets:
   - docs
   - tests-only
   - tooling/config/dependency
   - formatting-only churn
3. Inspect the remaining code diffs and group by shared user-facing intent.
4. Merge highly coupled source and test changes.
5. Split unrelated fixes or distinct features even if they live in the same top-level area.

## Strong Signals

- `*.md`, `docs/`, `README*`: usually `docs`
- `*.spec.*`, `*.test.*`, `tests/`: tests; attach to the verified feature or fix unless clearly standalone
- `.github/`, CI files, lint/formatter config, build config: usually `chore`
- wide indentation or quote-only churn with no behavior change: usually `style`
- rename with minimal content change: likely its own rename/refactor commit

## Warning Signals

Downgrade from `auto` when any warning signal appears:

- one file mixes business logic, refactor, and formatting in the same nearby hunks
- staged content appears intentionally curated but the inferred regrouping would restage it heavily
- generated files changed without a clear source change
- the same directory contains multiple bug fixes with different root causes
- diff volume is too large to review confidently in one pass

## Traditional Chinese Message Patterns

- `feat: 新增<功能或流程>`
- `fix: 修正<錯誤或異常>`
- `refactor: 重構<模組或邏輯>`
- `test: 補上<功能>測試`
- `docs: 更新<主題>說明`
- `chore: 調整<工具或設定>`
- `perf: 優化<流程或查詢效能>`
- `style: 整理<格式或排版>`

Keep one message focused on one primary purpose.
