---
description: Dispatch a slice-implementer subagent for a milestone slice. Auto-creates the worktree and symlinks node_modules. Usage: /slice <N> "<short description>". Reads the slice spec from docs/MILESTONES.md.
---

# /slice — Start a milestone slice

Arguments: `$ARGUMENTS` is `<slice-number> "<short description>"`, e.g. `/slice 8 "Lint-Baseline-Cleanup"`.

## What to do

1. **Determine current milestone branch.** Default: `feat/milestone-1`. If the user is on a different `feat/milestone-<N>` branch, use that.

2. **Create worktree if missing:**
   ```bash
   git worktree add -b feat/milestone-<M>-slice<N> /private/tmp/sitzplan-slice<N> feat/milestone-<M>
   ln -s /Volumes/T7/Projekte/gemini/sitzplan/node_modules /private/tmp/sitzplan-slice<N>/node_modules
   ```
   If the worktree already exists, skip.

3. **Look up slice spec.** Read `docs/MILESTONES.md` and find the bullet matching the slice number. If not present, the user must provide the spec inline in the prompt.

4. **Dispatch the subagent:**
   ```
   Agent({
     subagent_type: "slice-implementer",
     description: "Slice <N> <short title>",
     run_in_background: true,
     prompt: "<self-contained prompt: worktree path, branch, slice spec, acceptance criteria, pnpm reminders, baseline lint, commit message template>"
   })
   ```

5. **Report agent ID** to the user. Continue with other work while it runs.

## Self-contained prompt template

```
You implement Slice <N> (<title>) for the Sitzplan app.

Worktree: /private/tmp/sitzplan-slice<N>  (branch feat/milestone-<M>-slice<N>, based on feat/milestone-<M>).
pnpm is the package manager. node_modules is symlinked.

Spec:
<paste from docs/MILESTONES.md>

Acceptance:
- pnpm build green
- pnpm lint baseline (9 errors / 1 warning) unchanged
- <slice-specific acceptance>

Commit message format:
<conventional commit, e.g. feat(<scope>): <imperative>>

Do NOT push. Report back via the slice-implementer report format.
```

## Rejection cases

- If the working tree is dirty: stop and ask whether to stash or commit first.
- If the milestone branch doesn't exist: stop and ask the user to create it.
- If `node_modules` doesn't exist in the main worktree: run `pnpm install` there first.
