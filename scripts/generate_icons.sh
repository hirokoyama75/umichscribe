#!/usr/bin/env bash
# Generates PNG icons from src/icon.svg at all required resolutions for Chrome & Firefox extensions.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SRC_SVG="$ROOT_DIR/src/icon.svg"
ICONS_DIR="$ROOT_DIR/src/icons"

mkdir -p "$ICONS_DIR"

if command -v sips >/dev/null 2>&1; then
  echo "Generating PNG icons using sips..."
  sips -s format png -z 16 16 "$SRC_SVG" --out "$ICONS_DIR/icon16.png" >/dev/null
  sips -s format png -z 32 32 "$SRC_SVG" --out "$ICONS_DIR/icon32.png" >/dev/null
  sips -s format png -z 48 48 "$SRC_SVG" --out "$ICONS_DIR/icon48.png" >/dev/null
  sips -s format png -z 128 128 "$SRC_SVG" --out "$ICONS_DIR/icon128.png" >/dev/null
  echo "Icons successfully generated in src/icons/:"
  ls -lh "$ICONS_DIR"
else
  echo "Error: sips not found. Please convert src/icon.svg to PNGs manually or install a tool like ImageMagick/librsvg."
  exit 1
fi
