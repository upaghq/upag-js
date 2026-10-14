# Contributing

## Release flow

Releases are fully automatic. There is no manual `npm publish` and no version bump commit.

```
branch → PR → CI → merge to main → publish
```

1. Create a branch whose name starts with one of the prefixes below.
2. Open a PR against `main`. `ci.yml` validates the branch name, then runs `npm ci`, `npm test`, `npm run build`, `npm run check:bundle` and `npm pack --dry-run`.
3. Merge the PR (squash is fine).
4. `publish.yml` runs on the push to `main`, finds the merged PR's branch, bumps the version, publishes to npm and pushes the `vX.Y.Z` tag.

## Branch names

| Prefix | Release |
| --- | --- |
| `major/*`, `breaking/*` | major (`1.2.3` → `2.0.0`) |
| `feat/*`, `feature/*`, `minor/*` | minor (`1.2.3` → `1.3.0`) |
| `fix/*`, `hotfix/*`, `patch/*` | patch (`1.2.3` → `1.2.4`) |
| `docs/*`, `chore/*`, `ci/*` | no release |
| `staging` | no release (deploy-only, see below) |

Any other name fails CI. A push to `main` with no associated PR (a direct push) never publishes.

The mapping lives in `.github/scripts/branch-bump.sh`, shared by both workflows and the git hooks.

### `staging`

`staging` only drives the staging CDN deploy (`deploy-cdn.yml`). It is a valid branch name, but a PR from `staging` into `main` **never publishes**. To release, merge a `feat/*`, `fix/*` or `major/*` PR straight into `main`.

## Git hooks

Hooks live in `.githooks/` and are enabled automatically by `npm install` (the `prepare` script sets `core.hooksPath`; it is skipped when `CI` is set). To enable them without installing: `git config core.hooksPath .githooks`.

- `pre-commit`: refuses commits on `main`/`master` and on branches that don't follow the naming convention. Detached HEAD (rebase, bisect) is ignored.
- `pre-push`: refuses pushes to `main`/`master`. This also catches local merges and fast-forwards, which skip `pre-commit`. Pushing `staging` is allowed.

Rename a branch with `git branch -m feat/my-change`. In an emergency, `--no-verify` skips the hooks. Branch protection on GitHub is still what actually enforces the rule.

## Where the version comes from

The source of truth is the **latest git tag `v*`**, not `package.json`. The workflow does not commit back to `main`: on the runner it sets `package.json` to the last tag's version, applies the bump, publishes, then tags the commit.

So the `version` in the repo's `package.json` can be stale. Check the real version with `git tag --list 'v*' --sort=-v:refname | head -1` or `npm view upag-js version`.

Safety nets:

- No `v*` tag exists: the publish run fails ("Nenhuma tag v* encontrada…"). It never falls back to `v0.0.0`.
- The computed version already exists on npm: the publish run fails before publishing.

## Publishing auth

Publishing uses npm Trusted Publishing (OIDC) with provenance. There is no `NPM_TOKEN`. The trusted publisher is registered on npmjs.com for `upaghq/upag-js`, workflow `publish.yml`, no environment, with **Allow `npm publish`** ticked.

## Changelog

`CHANGELOG.md` is still edited by hand. Add entries under `[Unreleased]` in your PR and move them under the new version heading when you want to cut one.
