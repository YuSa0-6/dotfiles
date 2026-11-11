import type { HookAPI } from "@oh-my-pi/pi-coding-agent/extensibility/hooks";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";

type PrCreate = { base?: string };
type Token = { value: string; separator: boolean };

type Scan = { tokens: Token[]; value: string; quote: string; escaped: boolean };

const ASSIGNMENT = /^[A-Za-z_][A-Za-z_0-9]*=/;
const GH_OPTIONS_WITH_VALUE = ["-R", "--repo", "--hostname", "-C", "--config"];

export function parsePrCreate(command: string): PrCreate | undefined {
  for (const words of shellCommands(command)) {
    const createArgs = prCreateArgs(words);
    if (createArgs) return { base: baseOf(createArgs) };
  }
}

function prCreateArgs(words: string[]): string[] | undefined {
  const args = ghArgs(words);
  if (!args || args.includes("--help") || args.includes("-h")) return undefined;
  let position = 0;
  while (position < args.length && args[position].startsWith("-")) {
    position += GH_OPTIONS_WITH_VALUE.includes(args[position]) ? 2 : 1;
  }
  if (args[position] !== "pr" || args[position + 1] !== "create") return undefined;
  return args.slice(position + 2);
}

function ghArgs(words: string[]): string[] | undefined {
  let index = skipAssignments(words, 0);
  if (words[index] === "env") index = skipAssignments(words, index + 1);
  if (basename(words[index] ?? "") !== "gh") return undefined;
  return words.slice(index + 1);
}

function skipAssignments(words: string[], index: number): number {
  while (ASSIGNMENT.test(words[index] ?? "")) index++;
  return index;
}

function baseOf(createArgs: string[]): string | undefined {
  const baseIndex = createArgs.findIndex((arg) => arg === "--base" || arg === "-B");
  if (baseIndex >= 0) return createArgs[baseIndex + 1];
  return createArgs.find((arg) => arg.startsWith("--base="))?.slice(7);
}

function shellCommands(command: string): string[][] {
  const commands: string[][] = [[]];
  for (const token of tokenize(command)) {
    if (token.separator) commands.push([]);
    else commands[commands.length - 1].push(token.value);
  }
  return commands.filter((words) => words.length > 0);
}

function tokenize(command: string): Token[] {
  const scan: Scan = { tokens: [], value: "", quote: "", escaped: false };
  for (const char of command) {
    if (!readQuoted(scan, char)) readPlain(scan, char);
  }
  endWord(scan);
  return scan.tokens;
}

function readQuoted(scan: Scan, char: string): boolean {
  if (scan.escaped) {
    scan.value += char;
    scan.escaped = false;
    return true;
  }
  if (char === "\\" && scan.quote !== "'") {
    scan.escaped = true;
    return true;
  }
  if (!scan.quote) return false;
  if (char === scan.quote) scan.quote = "";
  else scan.value += char;
  return true;
}

function readPlain(scan: Scan, char: string): void {
  if (char === "'" || char === '"') {
    scan.quote = char;
    return;
  }
  if (!/\s/.test(char) && !";&|()".includes(char)) {
    scan.value += char;
    return;
  }
  endWord(scan);
  if (";&|()\n".includes(char)) scan.tokens.push({ value: char, separator: true });
}

function endWord(scan: Scan): void {
  if (scan.value) scan.tokens.push({ value: scan.value, separator: false });
  scan.value = "";
}

export function countChangedLines(numstat: string): number {
  let total = 0;
  for (const line of numstat.split("\n")) {
    const [added, deleted, ...parts] = line.split("\t");
    const path = parts.join("\t");
    const file = basename(path);
    if (!path || /(^|\/)drizzle\/meta\//.test(path)) continue;
    if (/^(pnpm-lock\.yaml|package-lock\.json|yarn\.lock|bun\.lock.*|mise\.lock|npm-shrinkwrap\.json|Cargo\.lock|Gemfile\.lock|composer\.lock|poetry\.lock|uv\.lock|Pipfile\.lock)$/.test(file)) continue;
    if (/^\d+$/.test(added) && /^\d+$/.test(deleted)) total += Number(added) + Number(deleted);
  }
  return total;
}

function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8", timeout: 10_000, stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function defaultBase(cwd: string): string {
  try { return git(cwd, "symbolic-ref", "refs/remotes/origin/HEAD"); }
  catch {
    const branch = execFileSync("gh", ["repo", "view", "--json", "defaultBranchRef", "--jq", ".defaultBranchRef.name"], {
      cwd, encoding: "utf8", timeout: 10_000, stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    if (!branch) throw new Error("remote default branch unavailable");
    return `origin/${branch}`;
  }
}

export function resolveDiffBase(cwd: string, base: string): string {
  if (base.startsWith("origin/") || base.startsWith("refs/")) return base;
  try {
    git(cwd, "rev-parse", "--verify", "--quiet", `refs/remotes/origin/${base}`);
    return `origin/${base}`;
  } catch {
    return base;
  }
}

type ToolInput = { op?: unknown; base?: unknown; command?: unknown; cwd?: unknown };
type Verdict = { block?: { block: true; reason: string }; warning?: string };

function requestedPr(toolName: string, input: ToolInput | undefined): PrCreate | undefined {
  if (toolName === "github" && input?.op === "pr_create") {
    return { base: typeof input.base === "string" ? input.base : undefined };
  }
  if (toolName === "bash" && typeof input?.command === "string") return parsePrCreate(input.command);
}

function reviewPassed(cwd: string, head: string): boolean {
  const reviewDir = git(cwd, "rev-parse", "--git-path", "omp-review");
  const record = resolve(cwd, reviewDir, `${head}.json`);
  return existsSync(record) && JSON.parse(readFileSync(record, "utf8")).verdict === "pass";
}

function inspect(cwd: string, pr: PrCreate): Verdict {
  const head = git(cwd, "rev-parse", "HEAD");
  if (!reviewPassed(cwd, head)) {
    return { block: { block: true, reason: `PR を作る前に team-review（security-audit を含む）を通してください。HEAD ${head} の通過記録がありません、または pass ではありません。` } };
  }
  const base = resolveDiffBase(cwd, pr.base || defaultBase(cwd));
  const lines = countChangedLines(git(cwd, "diff", "--numstat", `${base}...HEAD`));
  return lines > 300 ? { warning: `差分が ${lines} 行で300行を超えています。PR を分割してください。` } : {};
}

export default function prGate(pi: HookAPI): void {
  const warnings = new Map<string, string>();
  pi.on("tool_call", (event, ctx) => {
    const pr = requestedPr(event.toolName, event.input);
    if (!pr) return;
    try {
      const cwd = typeof event.input.cwd === "string" ? resolve(ctx.cwd, event.input.cwd) : ctx.cwd;
      const verdict = inspect(cwd, pr);
      if (verdict.warning) warnings.set(event.toolCallId, verdict.warning);
      return verdict.block;
    } catch (error) {
      pi.logger.error(`pr-gate fail open: ${String(error)}`);
    }
  });
  pi.on("tool_result", (event) => {
    try {
      const warning = warnings.get(event.toolCallId);
      if (!warning) return;
      warnings.delete(event.toolCallId);
      return { content: [...event.content, { type: "text", text: warning }] };
    } catch (error) {
      pi.logger.error(`pr-gate fail open: ${String(error)}`);
    }
  });
}
