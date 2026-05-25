---
description: Show Milestone 2 progress at a glance — which slices done, which open, last commit per slice, build/lint state, what's blocking merge.
---

# /m2-status — Milestone 2 status snapshot

## What to do

1. **Read `docs/M2_PLAN.md`** — Slice-Plan section + table.

2. **List slice branches:**
   ```bash
   git branch | grep "feat/m2-slice-"
   git log --oneline feat/milestone-2 ^main
   ```

3. **Per slice, identify status:**
   - merged into `feat/milestone-2`? → "merged at <commit>"
   - branch exists but not merged? → "branch exists, awaiting review"
   - no branch? → "not started"
   - Slice 2 was delivered as a pre-slice fast-forward on `feat/milestone-2` (commit `4c27b4c`, ADR 0004). Show as merged with that commit.

4. **Run on `feat/milestone-2`:**
   - `pnpm build` — green/red
   - `pnpm lint` — count vs. baseline (post-M1 baseline is effectively 0/0)
   - `pnpm test` — pass/fail counts
   - If a performance test exists: report duration vs. 2000 ms budget

5. **Render as a table:**

```
Milestone 2 — Solver-Qualität & Konfliktanalyse

| Slice | Title                                  | Status                 | Commit   |
|-------|----------------------------------------|------------------------|----------|
| 1     | Hard-violations valid:false + banner   | merged                 | <hash>   |
| 2     | Diagnostics field                      | merged (pre-slice)     | 4c27b4c  |
| 3     | Greedy + Restarts + Seed               | <status>               | <hash>   |
| 4     | Difficulty weighting                   | <status>               | <hash>   |
| 5     | Scoring explanations                   | <status>               | <hash>   |
| 6     | Dedup Top-3                            | <status>               | <hash>   |
| 7     | Tests + Performance budget             | <status>               | <hash>   |

ADRs: 0003 (Hybrid) / 0004 (Diagnostics) / 0005 (Seed) — present? yes/no

Build: green | red
Lint:  <n/m>  (baseline 0/0, delta +0)
Tests: <pass>/<fail>/<skip>
Perf : <ms> ms (budget 2000 ms) or N/A

Blocking for PR:
- <list>
```

6. **Mention any open worktrees** under `/private/tmp/sitzplan-slice*/` that haven't been merged.

Output only this table + the blocking list. No additional commentary.
