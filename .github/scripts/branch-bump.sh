#!/usr/bin/env bash
# Maps a PR branch name to a release type. Single source of truth for ci.yml, publish.yml and the git hooks.
# Usage: branch-bump.sh <branch-name>
# Prints one of: major | minor | patch | none | invalid
#   none    -> valid branch that does not publish (docs/, chore/, ci/ and the deploy-only `staging` branch)
#   invalid -> name not in the convention (treated as "none" by publish, rejected by CI and the hooks)
set -euo pipefail

branch="${1-}"

case "$branch" in
  major/* | breaking/*)             echo major ;;
  feat/* | feature/* | minor/*)     echo minor ;;
  fix/* | hotfix/* | patch/*)       echo patch ;;
  docs/* | chore/* | ci/*)          echo none ;;
  staging)                          echo none ;;  # deploy-only branch (CDN staging environment)
  *)                                echo invalid ;;
esac
