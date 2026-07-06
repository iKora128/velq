#!/bin/sh
# Regenerate the LP OpenGraph cards (1200x630): a large Velq app icon on a real,
# lightly-settled shot of the app's main screen, with a "Velq" wordmark set in
# Newsreader Italic (the LP's display serif). Requires ImageMagick (`magick`).
# Run from the repo root:
#   sh lp/scripts/make-og.sh
set -e

ICON="apps/desktop/src-tauri/icons/icon.png"
# Newsreader Italic (SIL OFL 1.1) — a static instance of Google's Newsreader
# variable font, matching the LP's display headings (--font-display). Bundled so
# the cards reproduce without a network or a system font install.
FONT="${OG_FONT:-lp/scripts/Newsreader-Italic.ttf}"
NAVY="#1f2a48"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Large app icon with a soft drop shadow (built once, reused for both languages).
magick "$ICON" -resize 384x384 \
  \( +clone -background black -shadow 55x26+0+22 \) +swap \
  -background none -layers merge +repage "$TMP/icon.png"

# Soft white halo to lift the icon + wordmark off the busy screenshot.
magick -size 1200x630 xc:none -fill 'rgba(255,255,255,0.55)' \
  -draw 'ellipse 600,315 330,240 0,360' -blur 0x70 "$TMP/halo.png"

card() { # $1 = hero screenshot, $2 = output png
  # Real screenshot, cover-cropped and gently settled, with a soft edge vignette.
  magick "$1" -resize 1200x630^ -gravity center -extent 1200x630 -modulate 96,104 "$TMP/shot.png"
  magick -size 1200x630 radial-gradient:none-'rgba(15,20,40,0.26)' "$TMP/vig.png"
  magick "$TMP/shot.png" "$TMP/vig.png" -compose over -composite "$TMP/bg.png"
  # Halo, then the big icon (nudged up), then the "Velq" wordmark below it.
  magick "$TMP/bg.png" "$TMP/halo.png" -compose over -composite \
    "$TMP/icon.png" -gravity center -geometry +0-40 -composite \
    -font "$FONT" -pointsize 66 -fill "$NAVY" -gravity center -annotate +0+198 "Velq" \
    "$2"
}

card "lp/public/shots/hero-en.webp" "lp/public/og-en.png"
card "lp/public/shots/hero-ja.webp" "lp/public/og-ja.png"
echo "Wrote lp/public/og-en.png and lp/public/og-ja.png"
