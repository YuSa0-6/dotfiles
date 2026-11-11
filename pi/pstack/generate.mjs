#!/usr/bin/env node
// pstack を Pi で動かすための写しを ~/.pi/agent/pstack に作る。
// 元は、Claude Code が取得した marketplace の clone にある Claude Code 向けの版。
// 公式はスキル本文を変えず、各スキルの冒頭に「対応表を先に読め」の1文を足す方式を取る。
// ここではその1文と対応表だけを Pi 向け（pi.md）に差し替える。本文には手を入れない。
// pstack を更新したら、このスクリプトを実行し直す。
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(homedir(), ".claude/plugins/marketplaces/cursor-plugins/harness/pstack/claude-code");
const OUT = join(homedir(), ".pi/agent/pstack");
const POINTER = /In Claude Code, read \[the Claude Code adapter\]\(([^)]*)claude-code\.md\) once per session before you follow this skill\. It maps the Cursor names in pstack skills to Claude Code\./;

if (!existsSync(SOURCE)) {
  console.error(`pstack が見つからない: ${SOURCE}\nClaude Code で pstack@cursor-plugins を入れてから実行する。`);
  process.exit(1);
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync(SOURCE, OUT, { recursive: true });
rmSync(join(OUT, "docs/harness/claude-code.md"));
cpSync(join(HERE, "pi.md"), join(OUT, "docs/harness/pi.md"));

let pointed = 0;
const stale = [];
for (const path of walk(OUT).filter((p) => p.endsWith(".md"))) {
  const text = readFileSync(path, "utf8");
  const next = text.replace(POINTER, (_line, up) => {
    pointed++;
    return `In Pi, read [the Pi adapter](${up}pi.md) once per session before you follow this skill. It maps the Cursor names in pstack skills to Pi.`;
  });
  if (next !== text) writeFileSync(path, next);
  // 公式の文面が変わると置き換えが空振りする。Claude Code 向けの案内が残ったスキルを知らせる。
  else if (path.endsWith("SKILL.md") && text.includes("harness/claude-code.md")) stale.push(path);
}

// ~/.pi/agent/skills に同じ名前のスキルがあると、設定で足した側（pstack）が勝ってしまう。
// 手元のスキルを優先するため、pstack 側の名前に pstack- を付ける。pstack の中では
// スキルをファイルの場所で読むので、フォルダ名は変えない。
const mine = new Set(readdirSync(join(homedir(), ".pi/agent/skills")).map((name) => name.replace(/\.md$/, "")));
const renamed = [];
for (const name of readdirSync(join(OUT, "skills")).filter((name) => mine.has(name))) {
  const path = join(OUT, "skills", name, "SKILL.md");
  const text = readFileSync(path, "utf8");
  const next = text.replace(/^name: .*$/m, `name: pstack-${name}`);
  if (next === text) stale.push(path);
  writeFileSync(path, next);
  renamed.push(name);
}
if (renamed.length > 0) console.log(`手元のスキルと同名のため pstack- を付けた: ${renamed.join(", ")}`);

const skills = readdirSync(join(OUT, "skills")).length;
console.log(`${OUT}: スキル ${skills} 個、Pi 向けの案内に差し替えた箇所 ${pointed}`);
if (pointed === 0 || stale.length > 0) {
  console.error("公式の案内文が変わった可能性がある。POINTER を見直す。", stale);
  process.exit(1);
}
