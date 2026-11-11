#!/bin/sh
# 空いている軌道の数を出す。Agent が新しいProjectを作る前に確かめるためのもの。
# 空きがあれば終了コード 0、なければ 1。
shared="${HERDR_APP_HOME:-$HOME/.config/herdr-app}/shared.json"
exec python3 - "$shared" <<'PY'
import json, sys
try:
    data = json.load(open(sys.argv[1]))
except (OSError, ValueError):
    data = {}
limit = max(1, min(8, int(data.get("solar.limit") or 8)))
used = sum(1 for slot in (data.get("solar.slots") or {}).values() if slot <= limit)
free = max(0, limit - used)
print(f"空き {free}（上限 {limit}、使用中 {used}）")
sys.exit(0 if free > 0 else 1)
PY
