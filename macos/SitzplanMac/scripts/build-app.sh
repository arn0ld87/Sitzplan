#!/usr/bin/env zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="$ROOT_DIR/dist/Sitzplaner.app"
CONTENTS_DIR="$APP_DIR/Contents"
MACOS_DIR="$CONTENTS_DIR/MacOS"

cd "$ROOT_DIR"
swift build --disable-index-store

rm -rf "$APP_DIR"
mkdir -p "$MACOS_DIR"

cp ".build/debug/SitzplanMac" "$MACOS_DIR/Sitzplaner"
chmod +x "$MACOS_DIR/Sitzplaner"

cat > "$CONTENTS_DIR/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>Sitzplaner</string>
  <key>CFBundleIdentifier</key>
  <string>de.alexle135.sitzplaner.native</string>
  <key>CFBundleName</key>
  <string>Sitzplaner</string>
  <key>CFBundleDisplayName</key>
  <string>Sitzplaner</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>0.1.0</string>
  <key>CFBundleVersion</key>
  <string>1</string>
  <key>LSMinimumSystemVersion</key>
  <string>13.0</string>
  <key>NSPrincipalClass</key>
  <string>NSApplication</string>
</dict>
</plist>
PLIST

codesign --force --deep --sign - "$APP_DIR" >/dev/null
echo "$APP_DIR"
