---
description: Merge all completed slice branches into the parent milestone branch sequentially. Stops on conflict and asks for guidance. Usage: /merge-slices [<milestone-number>].
---

# /merge-slices — Sequential merge of slice branches

Arguments: `$ARGUMENTS` is the milestone number (default `1`).

## What to do

1. **Identify the parent branch:** `feat/milestone-<M>`. Check out.

2. **List unmerged slice branches in ID order:**
   ```bash
   git branch | grep "feat/milestone-<M>-slice" | sort
   ```

3. **For each slice branch, in order:**
   a. Verify worktree build is green (visit `/private/tmp/sitzplan-slice<N>`, run `pnpm build`).
   b. `cd` back to main worktree.
   c. `git merge --no-ff feat/milestone-<M>-slice<N> -m "merge: Slice <N> — <short title from spec>"`
   d. If conflict:
      - **Stop.** Report file list + conflict markers.
      - Ask the user how to resolve.
      - Never `git checkout --theirs/--ours` blindly.
   e. After merge: `pnpm build && pnpm lint`. If lint added new findings or build broke, abort and revert with `git reset --hard HEAD~1`.
   f. Continue to next slice.

4. **After all merges:**
   - `git log --oneline <main-branch>..HEAD` — summarize what got merged.
   - Note any worktrees that are now stale (could be cleaned via `git worktree remove`, but DON'T do that automatically; ask first).

5. **Report:**

```
Merged into feat/milestone-<M>:
- Slice <N> — <title>  (merge commit <hash>)
- ...

Final HEAD: <hash>
Build: green
Lint:  <n/m>  (baseline 9/1)
Tests: <result> or N/A

Stale worktrees that can now be removed:
- /private/tmp/sitzplan-slice<N>
```

## Hard rules

- Sequential, never parallel — one merge at a time.
- Verify build+lint after each merge, not just at the end.
- Conflicts always stop the process — user decides.
- Never push.
- Never force-merge with `-X theirs/ours` without explicit user OK.
