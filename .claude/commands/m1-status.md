---
description: Show Milestone 1 progress at a glance — which slices done, which open, last commit per slice, build/lint state, what's blocking merge.
---

# /m1-status — Milestone 1 status snapshot

## What to do

1. **Read `docs/MILESTONES.md`** — Milestone-1 section + slice table.

2. **List slice branches:**
   ```bash
   git branch | grep "feat/milestone-1-slice"
   git log --oneline feat/milestone-1 ^main
   ```

3. **Per slice, identify status:**
   - merged into `feat/milestone-1`? → "merged at <commit>"
   - branch exists but not merged? → "branch exists, awaiting review"
   - no branch? → "not started"

4. **Run on `feat/milestone-1`:**
   - `pnpm build` — green/red
   - `pnpm lint` — count vs. baseline (9/1)
   - `pnpm test` — pass/fail counts (if test script exists)

5. **Render as a table:**

```
Milestone 1 — MVP-Härtung lokal

| Slice | Title                          | Status                | Commit   |
|-------|--------------------------------|-----------------------|----------|
| 1     | Storage versionierung          | merged                | <hash>   |
| 2     | Import-Validierung             | merged                | <hash>   |
| 3     | UUIDs                          | merged                | <hash>   |
| 4     | Schülerlöschung mit Cleanup    | enthalten in Slice 1  | -        |
| 5     | Solver valid-flag              | merged                | <hash>   |
| 6     | Vitest + Tests                 | branch exists / open  | <hash>   |
| 7     | GitHub Actions CI              | merged                | <hash>   |

Build: green | red
Lint:  <n/m>  (baseline 9/1, delta +0)
Tests: <pass>/<fail>/<skip>  or N/A

Blocking for PR:
- <list>
```

6. **Mention any open worktrees** under `/private/tmp/sitzplan-slice*/` that haven't been merged.

Output only this table + the blocking list. No additional commentary.
