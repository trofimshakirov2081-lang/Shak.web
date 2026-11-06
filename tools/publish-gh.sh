#!/bin/sh
# Выкладка сайта на GitHub Pages: собирает готовый сайт без исходников демо и отправляет в ветку gh-pages.
# Адрес: https://trofimshakirov2081-lang.github.io/Shak.web/
set -e
ROOT=$(cd "$(dirname "$0")/.." && pwd)
OUT=$(mktemp -d)
cp -r "$ROOT/index.html" "$ROOT/landing.css" "$ROOT/brief" "$ROOT/tz" "$ROOT/raboty" "$ROOT/demos" "$OUT/"
[ -d "$ROOT/sites" ] && cp -r "$ROOT/sites" "$OUT/"
rm -rf "$OUT/demos/_configs" "$OUT/demos/КАК-СДЕЛАТЬ-ДЕМО.md" "$OUT/raboty/videos.json"
touch "$OUT/.nojekyll"
cd "$OUT"
git init -q -b gh-pages
git add -A
git -c user.name="$(git -C "$ROOT" config user.name)" -c user.email="$(git -C "$ROOT" config user.email)" commit -qm "Выкладка $(date +%Y-%m-%d)"
git push -q -f "$(git -C "$ROOT" remote get-url origin)" gh-pages
echo "Готово: https://trofimshakirov2081-lang.github.io/Shak.web/ (обновится через 1-2 минуты)"
