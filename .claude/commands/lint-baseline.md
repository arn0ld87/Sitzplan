---
description: Show ESLint baseline vs current diff — which findings are pre-existing vs new. Helps decide if a PR added lint regressions.
---

# /lint-baseline — Compare lint state

## What to do

1. **Capture current state:**
   ```bash
   pnpm lint 2>&1 | tee /tmp/lint-now.txt
   ```

2. **Capture main-branch state:**
   ```bash
   git stash --include-untracked
   git checkout main
   pnpm lint 2>&1 | tee /tmp/lint-main.txt
   git checkout -
   git stash pop
   ```
   (Use a worktree if stash is risky.)

3. **Diff the two:**
   - List **new findings** (in `/tmp/lint-now.txt` but not in `/tmp/lint-main.txt`).
   - List **fixed findings** (in main but no longer in now).
   - Count baseline (main) vs current totals.

4. **Report:**

```
Lint baseline (main):  <n errors / m warnings>
Lint now (HEAD):       <n errors / m warnings>

New findings introduced:
- <file:line> <rule> — <message>
- ...

Findings fixed:
- <file:line> <rule>
- ...

Verdict: clean | <X> new findings to fix before merge
```

## Don't do

- Don't auto-fix. Just report.
- Don't suggest changes — that's for another slice.
