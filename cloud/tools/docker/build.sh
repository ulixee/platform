CURRENT_DIR=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )

cd $CURRENT_DIR
VERSION="$(node -p "require('../../main/package.json').version")"

if [ -z ${ADD_CHROME_VERSION+x} ];
then
  echo "Add a second chrome version using ADD_CHROME_VERSION"
else
  echo "Building Docker $VERSION. Adding chrome $ADD_CHROME_VERSION"
  ADD_TO_INSTALL="yarn add @ulixee/chrome-$ADD_CHROME_VERSION-0"
fi

# Optional: DOCKER_PLATFORMS=linux/amd64,linux/arm64 for multi-arch (requires buildx + QEMU).
# linux/arm64 needs Chrome majors with Google arm64 debs (151+) and chrome-versions
# linux_arm64 release assets (see ulixee/chrome-versions).
PLATFORMS="${DOCKER_PLATFORMS:-}"

if [ -n "$PLATFORMS" ]; then
  echo "Building multi-arch image for: $PLATFORMS"
  # Note: docker buildx cannot --load a multi-platform image into the local
  # daemon. This verifies the build; use CI / --push for registry manifests.
  docker buildx build \
    --platform "$PLATFORMS" \
    -t ulixee-cloud:$VERSION -t ulixee-cloud:latest \
    --build-arg ADD_TO_INSTALL="$ADD_TO_INSTALL" \
    --build-arg VERSION="$VERSION" \
    .
else
  docker build -t ulixee-cloud:$VERSION -t ulixee-cloud:latest \
    --build-arg ADD_TO_INSTALL="$ADD_TO_INSTALL" \
    --build-arg VERSION="$VERSION" \
    .
fi
