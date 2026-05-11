# Changesets

This folder is used by [Changesets](https://github.com/changesets/changesets) to version `@goldspire/*` packages.

## Workflow

1. After making a change to any `packages/*`, run `pnpm changeset` and follow the prompts to describe the change and select a semver bump.
2. Commit the generated markdown file along with your code.
3. On the next release, `pnpm version` will consume all pending changesets and bump package versions accordingly.
4. `pnpm release` builds and publishes (if configured).

Apps (`apps/*`) are not versioned — they consume the published packages directly. See `config.json` for the ignored list.
