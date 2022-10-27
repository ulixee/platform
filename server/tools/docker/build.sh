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


docker build -t ulixee-server:$VERSION -t ulixee-server:latest \
  --build-arg ADD_TO_INSTALL="$ADD_TO_INSTALL" \
  --build-arg VERSION="$VERSION" \
  .
