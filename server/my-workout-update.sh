#!/usr/bin/env bash
set -euo pipefail

REPO=/var/www/workout-copy
BRANCH=main

cd "$REPO"

# Do not overwrite manual server-side edits.
CHANGES=$(git status --porcelain | grep -vE "^\?\? videos(/|$)" || true)
if [[ -n "$CHANGES" ]]; then
  echo "my-workout-update: working tree is not clean; skipping update"
  exit 0
fi

git fetch --quiet origin "$BRANCH"
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse "origin/$BRANCH")

if [[ "$LOCAL" == "$REMOTE" ]]; then
  echo "my-workout-update: already up to date ($LOCAL)"
  exit 0
fi

# Only accept a fast-forward update from the tracked branch.
if ! git merge-base --is-ancestor "$LOCAL" "$REMOTE"; then
  echo "my-workout-update: refusing non-fast-forward update" >&2
  exit 1
fi

git merge --ff-only --quiet "origin/$BRANCH"
systemctl restart my-workout
echo "my-workout-update: updated to $(git rev-parse --short HEAD) and restarted my-workout"
