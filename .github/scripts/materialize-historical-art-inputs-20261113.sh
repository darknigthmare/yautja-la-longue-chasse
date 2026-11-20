#!/usr/bin/env bash
set -euo pipefail

# Published 2026-11-13 packs record exact paths and digests for historical
# sources. Replay those bytes in the disposable CI checkout while the dated
# verifiers run. The campaign Bible and the CI definitions can evolve on main.
archived_commit=fc4252e3e50535ec1b7e3b7470c42d29dea51568
archived_paths=(
  docs/campagne/BIBLE_DE_CAMPAGNE.md
  .github/workflows/biomask-candidates.yml
  .github/workflows/biomask-lots40-candidates.yml
  .github/workflows/dual-biomask-candidates.yml
  .github/workflows/mask-expansion-candidates.yml
  .github/workflows/neutral-mask-candidates.yml
  .github/workflows/p0-sprite-candidates.yml
  .github/workflows/primary-biomask-candidates.yml
)

case "${1:-}" in
  archived)
    source="$archived_commit"
    ;;
  current)
    source=HEAD
    ;;
  *)
    printf 'Usage: %s archived|current\n' "$0" >&2
    exit 2
    ;;
esac

selected=()
for file in "${archived_paths[@]}"; do
  if [[ -e "$file" || -L "$file" ]]; then
    selected+=("$file")
  fi
done

if (( ${#selected[@]} == 0 )); then
  exit 0
fi

if [[ "$source" == "$archived_commit" ]]; then
  git fetch --no-tags --depth=1 --filter=blob:none origin "$archived_commit"
fi

git restore --worktree --source="$source" -- "${selected[@]}"
