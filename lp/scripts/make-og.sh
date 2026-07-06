#!/bin/sh
# Regenerate the LP OpenGraph cards (1200x630): the Velq app icon floating on a
# heavily blurred shot of the main screen, with a serif "Velq" wordmark below.
# Requires ImageMagick (`magick`). Run from the repo root:
#   sh lp/scripts/make-og.sh
set -e

ICON="apps/desktop/src-tauri/icons/icon.png"
SERIF="${OG_SERIF:-/System/Library/Fonts/NewYork.ttf}" # literary serif; override with OG_SERIF
NAVY="#223052"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# App icon with a soft drop shadow (built once, reused for both languages).
magick "$ICON" -resize 300x300 \
  \( +clone -background black -shadow 46x20+0+15 \) +swap \
  -background none -layers merge +repage "$TMP/icon.png"

card() { # $1 = hero screenshot, $2 = output png
  # Cover-crop the shot to 1200x630, then blur, mute and vignette it.
  magick "$1" -resize 1200x630^ -gravity center -extent 1200x630 \
    -blur 0x18 -modulate 99,86 "$TMP/bg.png"
  magick -size 1200x630 radial-gradient:none-'rgba(18,26,54,0.30)' "$TMP/vig.png"
  magick "$TMP/bg.png" "$TMP/vig.png" -compose over -composite "$TMP/bg2.png"
  # Icon centered (nudged up) with the "Velq" wordmark beneath it.
  magick "$TMP/bg2.png" "$TMP/icon.png" -gravity center -geometry +0-54 -composite \
    -font "$SERIF" -pointsize 74 -fill "$NAVY" -gravity center -annotate +0+142 "Velq" \
    "$2"
}

card "lp/public/shots/hero-en.webp" "lp/public/og-en.png"
card "lp/public/shots/hero-ja.webp" "lp/public/og-ja.png"
echo "Wrote lp/public/og-en.png and lp/public/og-ja.png"
