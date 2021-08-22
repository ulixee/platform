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
  tar -czf "../assets/boss-${PACKAGE_VERSION}-mac.tar.gz" "Ulixee Boss.app"
  cd ..
fi

if [ -d "./mac-arm64" ]; then
  cd "mac-arm64"
  echo "Packing mac-arm64"
  tar -czf "../assets/boss-${PACKAGE_VERSION}-mac-arm64.tar.gz" "Ulixee Boss.app"
  cd ..
fi

if [ -d "./linux-unpacked" ]; then
  echo "Packing linux"
  if [ -d "./boss-${PACKAGE_VERSION}-linux" ]; then
    rm -rf "./boss-${PACKAGE_VERSION}-linux"
  fi
  mv linux-unpacked "boss-${PACKAGE_VERSION}-linux"
  tar -czf "assets/boss-${PACKAGE_VERSION}-linux.tar.gz" "boss-${PACKAGE_VERSION}-linux"
fi

if [ -d "./win-unpacked" ]; then
  echo "Packing windows"
  if [ -d "./boss-${PACKAGE_VERSION}-win" ]; then
    rm -rf "./boss-${PACKAGE_VERSION}-win"
  fi
  mv win-unpacked "boss-${PACKAGE_VERSION}-win"
  tar -czf "assets/boss-${PACKAGE_VERSION}-win.tar.gz" "boss-${PACKAGE_VERSION}-win"
fi
