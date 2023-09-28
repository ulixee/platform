#!/usr/bin/env bash

CURRENT_DIR=$( cd "$(dirname "${BASH_SOURCE[0]}")/.." ; pwd -P );
trap "exit" INT;

declare -a dirs=("shared" "unblocked" "payments" "platform/hero" "platform");

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

  # if platform, create a release branch before push
  if [[ "$dir" == "platform" ]]; then
    echo "Creating release branch for $dir... $(pwd)";
    git checkout -b release;
    git push origin release --tags;
    echo "You need to create a DRAFT release at https://github.com/ulixee/platform/releases/new";
    read -p "Press enter only once you've once all assets are built here...";
  else
    git push origin main --tags  --no-verify;
  fi

  wait 5;

  if [[ "$dir" == "unblocked" ]]; then
    echo "You need to approve the DRAFT release at https://github.com/ulixee/unblocked/releases/tag/$TAG";
    read -p "Press enter only once you've done that (npm needs the assets built)...";
  fi

  cd "./build-dist";
  echo "Publishing $dir... $(pwd)";
  lerna publish from-package;

  if [[ "$dir" == "platform" ]]; then
     echo "You need to approve the DRAFT release at https://github.com/ulixee/platform/releases/tag/$TAG";
  fi
done


cd "$CURRENT_DIR/platform/website";
yarn build && yarn deploy;

