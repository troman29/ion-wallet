#!/usr/bin/env bash

DESTINATION=${1:-"dist"}
SOURCE=${2:-"public"}

cp -R ./$SOURCE/* "$DESTINATION/"

cp ./src/lib/rlottie/rlottie-wasm.js "$DESTINATION/"
cp ./src/lib/rlottie/rlottie-wasm.wasm "$DESTINATION/"

FILES_TO_REMOVE=("static-sites")

if [ "$IS_CAPACITOR" = "1" ] || [ "$IS_EXTENSION" = "1" ] || [ "$IS_PACKAGED_ELECTRON" = "1" ]; then
    FILES_TO_REMOVE+=("get" "_headers" "_redirects")
fi

if [ "$IS_EXTENSION" = "1" ]; then
    FILES_TO_REMOVE+=("site.webmanifest")
fi

FILES_TO_REMOVE+=("assets/")

if [ "$IS_PACKAGED_ELECTRON" != "1" ]; then
    FILES_TO_REMOVE+=("background-electron-dmg.tiff" "electron-entitlements.mac.plist" "icon-electron-*")
fi

for FILE in "${FILES_TO_REMOVE[@]}"; do
    rm -rf $DESTINATION/$FILE
done
