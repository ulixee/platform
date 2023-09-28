#!/usr/bin/env bash

CURRENT_DIR=$( cd "$(dirname "${BASH_SOURCE[0]}")/.." ; pwd -P );

declare -a dirs=("shared" "unblocked" "payments" "platform/hero" "platform");

# loop through dirs
for dir in "${dirs[@]}"; do
  cd "$CURRENT_DIR/$dir";
  echo "Building $dir... $(pwd)";
  yarn version:bump prerelease;
  yarn version:check;
  yarn build && yarn build:dist;
done

# loop through dirs and if any git changes, commit and push
for dir in "${DIRS[@]}"; do
  cd "$CURRENT_DIR/$dir";
  if [[ $(git status --porcelain) ]]; then
    echo "Committing and pushing $dir... $(pwd)";
    git commit --amend --no-edit -a;
    git tag -f $(git tag -l --points-at HEAD);
  fi
done
