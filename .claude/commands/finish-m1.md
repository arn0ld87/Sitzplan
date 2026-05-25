---
description: Final integration of Milestone 1 — verify all slices merged, run full quality gate, refresh CHANGELOG, prepare PR description. Does not push or open PR by itself.
---

# /finish-m1 — Final M1 integration

## What to do

1. **Verify branch.** Must be on `feat/milestone-1` with a clean working tree.

2. **Run `/m1-status`** to confirm all slices are merged.

3. **Full quality gate:**
   ```bash
   pnpm install --frozen-lockfile
   pnpm lint
   pnpm build
   pnpm test
   ```
   All must pass (lint may show baseline 9/1; that's the known open issue).

4. **Refresh `CHANGELOG.md`:** ensure the `[Unreleased]` section accurately reflects what's on the branch. Use `git log feat/milestone-1 ^main --oneline` for the source of truth.

5. **Refresh `docs/MILESTONES.md`:** mark Slice 6 done (if applicable), update the status table.

6. **Prepare PR description** (DO NOT open the PR — just print it for the user):

```
## Summary
- Milestone 1: MVP-Härtung lokal — versioned localStorage, import validation,
  randomUUID-based IDs, solver hard-constraint marking, student-delete with
  rule cleanup, Vitest test suite, GitHub Actions CI.
- ADR 0002 documents the storage-versioning decision.
- Project standardized on pnpm; CLAUDE.md documents CRG + context-mode workflow.

## Test plan
- [ ] `pnpm build` green
- [ ] `pnpm lint` shows baseline (9 errors / 1 warning) — pre-existing
- [ ] `pnpm test` green
- [ ] Manual: import a broken JSON → existing data untouched
- [ ] Manual: delete a student → referencing rules are removed
- [ ] Manual: generate plan with conflicting `not_beside` rules → diagnostic
- [ ] Manual: dark + light mode + print preview

## Known open
- Pre-existing lint baseline (9/1) — separate cleanup slice planned.
- Export format not yet aligned with PFLICHTENHEFT §3.1 (`SitzplanerProjectFile`); validation accepts both forms.
```

7. **Print:** PR title (`feat: Milestone 1 — MVP-Härtung lokal`), branch name, and the body above. Tell the user to run `gh pr create` themselves or to invoke `/pr` (a follow-up command, not provided here).

## Don't do

- Don't push.
- Don't open the PR.
- Don't squash or rebase commits — preserve the slice history.
- Don't bump version numbers.
