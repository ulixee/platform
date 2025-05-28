#!/usr/bin/env bash

CURRENT_DIR=$( cd "$(dirname "${BASH_SOURCE[0]}")/.." ; pwd -P );
trap "exit" INT;

declare -a dirs=("hero" "platform");

# loop through dirs
for dir in "${dirs[@]}"; do
  cd "$CURRENT_DIR/$dir";
  echo "Building $dir... $(pwd)";
  yarn version:check;
  yarn version:bump prerelease;
  yarn version:check;
  yarn build && yarn build:dist;
done

cd "$CURRENT_DIR/platform";
yarn version:check;


read -p "Hit enter to start publishing...";

# loop through dirs and if any git changes, commit and push
for dir in "${dirs[@]}"; do
  cd "$CURRENT_DIR/$dir";
  TAG=$(git tag -l --points-at HEAD);
  if [[ $(git status --porcelain) ]]; then
    echo "Adding changes and re-tagging $dir... $(pwd)";
    git commit --amend --no-edit -a;
    git tag -f "$TAG";
  fi

  git push origin main --tags  --no-verify;

  wait 5;

  # TODO: add desktop publishing (create a new branch with a tag and push it - will create new assets)

  if [[ "$dir" == "hero" ]]; then
    echo "You need to approve the DRAFT release at https://github.com/ulixee/hero/releases/tag/$TAG";
    read -p "Press enter only once you've done that (npm needs the assets built)...";
  fi

  cd "./build-dist";
  echo "Publishing $dir... $(pwd)";
  npx lerna publish from-package;

  if [[ "$dir" == "platform" ]]; then
     echo "You need to approve the DRAFT release at https://github.com/ulixee/platform/releases/tag/$TAG";
  fi
done
