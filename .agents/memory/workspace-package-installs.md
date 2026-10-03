---
name: Workspace package installs
description: Installing dependencies in a package inside this pnpm workspace.
---

When adding a dependency to an artifact, keep it in that artifact's package manifest. The generic package-install callback may try to add it to the workspace root and reject the operation with `ERR_PNPM_ADDING_TO_ROOT`; use a package-scoped pnpm install when that happens.

**Why:** Root-level installation can put a frontend dependency in the wrong package and leave the artifact unable to resolve it.

**How to apply:** After a workspace artifact's package manifest and lockfile include a new dependency, install it with that package's pnpm filter, then restart its managed workflow.