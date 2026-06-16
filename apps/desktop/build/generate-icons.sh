#!/bin/bash
# Generate app icons from a source image.
# Usage: ./generate-icons.sh <path-to-logo.png>
# The source PNG should be at least 1024x1024 for best results.
#
# Prerequisites (macOS): sips, iconutil (built-in)

set -e

SRC="${1:-icon-source.png}"
BUILD_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ ! -f "$SRC" ]; then
  echo "Usage: $0 <path-to-logo.png>"
  echo "Provide a PNG source image (recommended: 1024x1024 or larger)"
  exit 1
fi

echo "Generating icons from: $SRC"

# === macOS .icns ===
echo "  → icon.icns"
ICONSET="$BUILD_DIR/icon.iconset"
rm -rf "$ICONSET"
mkdir -p "$ICONSET"

sips -z 16 16   "$SRC" --out "$ICONSET/icon_16x16.png"
sips -z 32 32   "$SRC" --out "$ICONSET/icon_16x16@2x.png"
sips -z 32 32   "$SRC" --out "$ICONSET/icon_32x32.png"
sips -z 64 64   "$SRC" --out "$ICONSET/icon_32x32@2x.png"
sips -z 128 128 "$SRC" --out "$ICONSET/icon_128x128.png"
sips -z 256 256 "$SRC" --out "$ICONSET/icon_128x128@2x.png"
sips -z 256 256 "$SRC" --out "$ICONSET/icon_256x256.png"
sips -z 512 512 "$SRC" --out "$ICONSET/icon_256x256@2x.png"
sips -z 512 512 "$SRC" --out "$ICONSET/icon_512x512.png"
sips -z 1024 1024 "$SRC" --out "$ICONSET/icon_512x512@2x.png"

iconutil -c icns "$ICONSET" -o "$BUILD_DIR/icon.icns"
rm -rf "$ICONSET"

# === Base PNG for Windows .ico (electron-builder auto-converts) ===
echo "  → icon.png"
cp "$SRC" "$BUILD_DIR/icon.png"

echo ""
echo "Done! Generated files in $BUILD_DIR/:"
ls -lh "$BUILD_DIR/icon.icns" "$BUILD_DIR/icon.png"
echo ""
echo "Now run: pnpm pack:mac   (or pack:win, pack:linux, pack:all)"
