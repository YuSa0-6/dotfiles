#!/bin/sh
# リポジトリの名前から、ghq が clone した本体のフォルダを出す。Agent が惑星をそこに出すためのもの。
# 本体を使うのは、未コミットの変更がそのまま見え、同じリポジトリを別の場所に重ねて持たずに済むため。
# 終了コード 0：フォルダのパスを1行出す。1：「なし」（その名前の本体がない）。
# 2：そこには出せない（理由を1行出す。別の惑星が使っている、同じ名前の本体が複数ある）。
exec python3 - "${1:-}" <<'PY'
import json, os, subprocess, sys

def lines(argv):
    try:
        return subprocess.run(argv, capture_output=True, text=True).stdout.splitlines()
    except OSError:
        return []

name = sys.argv[1]
# worktree は .git がファイルになる。本体だけを残す。
clones = [p for p in lines(["ghq", "list", "-p", "-e", name]) if name and os.path.isdir(os.path.join(p, ".git"))]
if not clones:
    print("なし")
    sys.exit(1)
if len(clones) > 1:
    print(f"{name} という本体が複数あります。owner/repo の形で頼んでください")
    sys.exit(2)

folder = os.path.realpath(clones[0])
try:
    spaces = json.loads("\n".join(lines(["herdr-app", "ls"]))).get("spaces", [])
except ValueError:
    spaces = []
# 同じ作業ツリーを2体のAgentが同時に書き換えないよう、本体1つにつき惑星は1つにする。
for space in spaces:
    if space.get("folder") and os.path.realpath(space["folder"]) == folder:
        print(f"{name} は、惑星 {space.get('name')} が使っています")
        sys.exit(2)
print(folder)
PY
