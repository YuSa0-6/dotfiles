#!/bin/sh
# ~/.config/herdr-app にある Solar の実物を、このフォルダへ写す。
# Herdr が mod フォルダへファイルを書き足すため、symlink ではなくコピーで管理している。
set -eu

src="${HERDR_APP_HOME:-$HOME/.config/herdr-app}"
dst="$(cd "$(dirname "$0")" && pwd)"

mkdir -p "$dst/layouts" "$dst/mods/solar"
cp "$src/layouts/solar.json" "$dst/layouts/solar.json"
# gpui-kit.d.ts と jsconfig.json は Herdr が自動で書き出すので写さない。
rsync -a --delete \
  --exclude 'gpui-kit.d.ts' --exclude 'jsconfig.json' --exclude '.DS_Store' \
  "$src/mods/solar/" "$dst/mods/solar/"

git -C "$dst" status --short -- .
