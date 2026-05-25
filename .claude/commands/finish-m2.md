---
description: Final integration of Milestone 2 — verify all slices merged, run full quality gate, refresh CHANGELOG, prepare PR description. Does not push or open PR by itself.
---

# /finish-m2 — Final M2 integration

## What to do

1. **Verify branch.** Must be on `feat/milestone-2` with a clean working tree.

2. **Run `/m2-status`** to confirm all slices are merged (Slice 2 is satisfied by the pre-slice commit `4c27b4c`).

3. **Full quality gate:**
   ```bash
   pnpm install --frozen-lockfile
   pnpm lint
   pnpm build
   pnpm test
   ```
   All must pass. Lint should stay at the post-M1 baseline (effectively 0/0).

4. **Performance budget check.** The Slice 7 performance test must report < 2000 ms for the 35-students / 30-rules fixture. If it fails on a slow machine, document the measurement environment in the PR body but do not relax the assertion silently.

5. **Refresh `CHANGELOG.md`:** ensure the `[Unreleased]` section accurately reflects what's on the branch. Use `git log feat/milestone-2 ^main --oneline` for the source of truth. Group changes by slice.

6. **Refresh `docs/MILESTONES.md`:** mark Milestone 2 done; update the status table; add the merge date.

7. **Prepare PR description** (DO NOT open the PR — just print it for the user):

```
## Summary
- Milestone 2: Solver-Qualität & Konfliktanalyse — hybrid solver
  (greedy initial + simulated annealing + random restarts), seedable
  RNG for determinism, embedded SolverDiagnostics with bottleneck and
  contradictory-rule detection, dedup of structurally distinct
  top-3 proposals, difficulty-weighted scoring, German-language
  violation explanations, and a 2-second performance budget enforced
  by a Vitest test on a 35/30 fixture.
- ADR 0003 documents the hybrid-solver decision (Greedy + SA).
- ADR 0004 documents diagnostics-in-proposal (vs. separate endpoint).
- ADR 0005 documents the optional-seed API for determinism.

## Test plan
- [ ] `pnpm build` green
- [ ] `pnpm lint` at post-M1 baseline (delta 0)
- [ ] `pnpm test` green; performance test < 2000 ms
- [ ] Manual: unsolvable rule set → warning banner + diagnostics panel
- [ ] Manual: same seed → identical proposals on two consecutive runs
- [ ] Manual: top-3 differ in ≥ 30 % of assignments on the large class
- [ ] Manual: dark + light + print preview

## Known open
- KI-Chat-based conflict resolution remains M3+ scope.
- Drag-&-drop override in Generator remains M3+ scope.
```

8. **Print:** PR title (`feat: Milestone 2 — Solver-Qualität & Konfliktanalyse`), branch name, and the body above. Tell the user to run `gh pr create` themselves.

## Don't do

- Don't push.
- Don't open the PR.
- Don't squash or rebase commits — preserve the slice history (the merge commits show the slice boundaries).
- Don't bump version numbers.
