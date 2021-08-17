PACKAGE_VERSION=$(cat package.json \
  | grep version \
  | head -1 \
  | awk -F: '{ print $2 }' \
  | sed 's/[",]//g' \
  | tr -d '[[:space:]]')

cd dist

mkdir -p assets

if [ -d "./mac" ]; then
  cd mac
  echo "Packing mac"
  tar -czf "../assets/chromealive-${PACKAGE_VERSION}-mac.tar.gz" ChromeAlive!.app
  cd ..
fi

if [ -d "./mac-arm64" ]; then
  cd "mac-arm64"
  echo "Packing mac-arm64"
  tar -czf "../assets/chromealive-${PACKAGE_VERSION}-mac-arm64.tar.gz" ChromeAlive!.app
  cd ..
fi

if [ -d "./linux-unpacked" ]; then
  echo "Packing linux"
  if [ -d "./chromealive-${PACKAGE_VERSION}-linux" ]; then
    rm -rf "./chromealive-${PACKAGE_VERSION}-linux"
  fi
  mv linux-unpacked "chromealive-${PACKAGE_VERSION}-linux"
  tar -czf "assets/chromealive-${PACKAGE_VERSION}-linux.tar.gz" "chromealive-${PACKAGE_VERSION}-linux"
fi

if [ -d "./win-unpacked" ]; then
  echo "Packing windows"
  if [ -d "./chromealive-${PACKAGE_VERSION}-win" ]; then
    rm -rf "./chromealive-${PACKAGE_VERSION}-win"
  fi
  mv win-unpacked "chromealive-${PACKAGE_VERSION}-win"
  tar -czf "assets/chromealive-${PACKAGE_VERSION}-win.tar.gz" "chromealive-${PACKAGE_VERSION}-win"
fi
