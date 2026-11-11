import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import prGate, { countChangedLines, parsePrCreate, resolveDiffBase } from "../pre/pr-gate";

describe("PR command classification", () => {
  test("recognizes global repo flags and leading environment assignments", () => {
    expect(parsePrCreate("GH_HOST=example.com gh -R owner/repo pr create --base release"))
      .toEqual({ base: "release" });
    expect(parsePrCreate("env GH_HOST=example.com gh --repo=owner/repo pr create --base=main"))
      .toEqual({ base: "main" });
    expect(parsePrCreate("echo ok && gh pr create -B 'release branch'"))
      .toEqual({ base: "release branch" });
  });
  test("ignores help, quoted text, and other gh commands", () => {
    expect(parsePrCreate("gh pr create --help")).toBeUndefined();
    expect(parsePrCreate("gh -R repo pr create -h")).toBeUndefined();
    expect(parsePrCreate("echo 'gh pr create'")).toBeUndefined();
    expect(parsePrCreate("gh pr view")).toBeUndefined();
  });
  test("splits commands on separators and keeps quoted or escaped text as one word", () => {
    expect(parsePrCreate("(cd app; gh pr create)")).toEqual({});
    expect(parsePrCreate("git status\ngh pr create")).toEqual({});
    expect(parsePrCreate("echo done | /opt/homebrew/bin/gh pr create")).toEqual({});
    expect(parsePrCreate("gh pr create --title 'fix; gh pr list' --base \"main\"")).toEqual({ base: "main" });
    expect(parsePrCreate("gh pr create --title fix\\ it -B main")).toEqual({ base: "main" });
    expect(parsePrCreate("gh pr create --title 'unterminated --base main")).toEqual({});
    expect(parsePrCreate("gh pr; create")).toBeUndefined();
    expect(parsePrCreate("git commit -m \"gh pr create\"")).toBeUndefined();
  });
});

test("prefers remote base refs over stale local branches, including stacked PR branches", () => {
  const cwd = mkdtempSync(join(tmpdir(), "pr-gate-base-"));
  const git = (...args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
  try {
    git("init", "-q", "-b", "main");
    git("config", "user.email", "test@example.invalid");
    git("config", "user.name", "Test");
    git("commit", "--allow-empty", "-qm", "old local main");
    git("switch", "-qc", "remote-main");
    mkdirSync(join(cwd, "src"));
    writeFileSync(join(cwd, "src", "app.ts"), Array.from({ length: 301 }, (_, index) => `line ${index}\n`).join(""));
    git("add", "src/app.ts");
    git("commit", "-qm", "remote main");
    git("update-ref", "refs/remotes/origin/main", "HEAD");
    git("update-ref", "refs/remotes/origin/issue/352", "HEAD");
    git("switch", "-qc", "feature");
    writeFileSync(join(cwd, "src", "next.ts"), "one line\n");
    git("add", "src/next.ts");
    git("commit", "-qm", "feature");
    expect(resolveDiffBase(cwd, "main")).toBe("origin/main");
    expect(resolveDiffBase(cwd, "issue/352")).toBe("origin/issue/352");
    expect(resolveDiffBase(cwd, "local-only")).toBe("local-only");
    expect(countChangedLines(git("diff", "--numstat", `${resolveDiffBase(cwd, "main")}...HEAD`))).toBe(1);
    expect(countChangedLines(git("diff", "--numstat", "main...HEAD"))).toBe(302);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

describe("generated files in numstat", () => {
  test("counts added and deleted text lines while excluding lockfiles and Drizzle metadata", () => {
    expect(countChangedLines([
      "200\t100\tsrc/app.ts",
      "1\t0\tsrc/next.ts",
      "900\t100\tpnpm-lock.yaml",
      "900\t100\tnested/bun.lockb",
      "900\t100\tdrizzle/meta/_journal.json",
      "900\t100\tproject/drizzle/meta/0001_snapshot.json",
      "-\t-\timage.png",
    ].join("\n"))).toBe(301);
  });
});

describe("hook", () => {
  type Handler = (event: any, ctx?: any) => any;
  const hook = () => {
    const handlers: Record<string, Handler> = {};
    const errors: string[] = [];
    prGate({
      on: (name: string, handler: Handler) => { handlers[name] = handler; },
      logger: { error: (message: string) => { errors.push(message); } },
    } as any);
    return { call: handlers.tool_call, result: handlers.tool_result, errors };
  };
  const create = (input: Record<string, unknown> = {}) =>
    ({ toolName: "github", toolCallId: "call", input: { op: "pr_create", ...input } });
  // A repository whose HEAD is `changed` lines ahead of origin/main.
  const withRepo = (changed: number, run: (cwd: string, git: (...args: string[]) => string) => void) => {
    const cwd = mkdtempSync(join(tmpdir(), "pr-gate-hook-"));
    const git = (...args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
    try {
      git("init", "-q", "-b", "main");
      git("config", "user.email", "test@example.invalid");
      git("config", "user.name", "Test");
      git("commit", "--allow-empty", "-qm", "base");
      git("update-ref", "refs/remotes/origin/main", "HEAD");
      git("symbolic-ref", "refs/remotes/origin/HEAD", "refs/remotes/origin/main");
      git("switch", "-qc", "feature");
      writeFileSync(join(cwd, "app.ts"), "line\n".repeat(changed));
      git("add", "app.ts");
      git("commit", "-qm", "feature");
      run(cwd, git);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  };
  const review = (cwd: string, git: (...args: string[]) => string, verdict: string) => {
    const dir = join(cwd, git("rev-parse", "--git-path", "omp-review"));
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${git("rev-parse", "HEAD")}.json`), JSON.stringify({ verdict }));
  };

  test("lets calls through that do not create a PR", () => {
    const { call, errors } = hook();
    expect(call({ toolName: "bash", toolCallId: "1", input: { command: "git status" } }, { cwd: tmpdir() })).toBeUndefined();
    expect(call({ toolName: "github", toolCallId: "2", input: { op: "pr_list" } }, { cwd: tmpdir() })).toBeUndefined();
    expect(call({ toolName: "read", toolCallId: "3" }, { cwd: tmpdir() })).toBeUndefined();
    expect(errors).toEqual([]);
  });
  test("blocks PR creation until HEAD has a passing review record", () => {
    withRepo(1, (cwd, git) => {
      const blocked = hook().call(create(), { cwd });
      expect(blocked.block).toBe(true);
      expect(blocked.reason).toContain(git("rev-parse", "HEAD"));
      const viaBash = { toolName: "bash", toolCallId: "call", input: { command: "gh pr create --base main" } };
      expect(hook().call(viaBash, { cwd }).block).toBe(true);
      review(cwd, git, "fail");
      expect(hook().call(create(), { cwd }).block).toBe(true);
    });
  });
  test("passes a reviewed small diff without adding anything to the result", () => {
    withRepo(10, (cwd, git) => {
      review(cwd, git, "pass");
      const { call, result } = hook();
      expect(call(create(), { cwd })).toBeUndefined();
      expect(result({ toolCallId: "call", content: [] })).toBeUndefined();
    });
  });
  test("appends one warning to the result when the diff exceeds 300 lines", () => {
    withRepo(301, (cwd, git) => {
      review(cwd, git, "pass");
      const { call, result } = hook();
      expect(call(create({ base: "main" }), { cwd })).toBeUndefined();
      const out = result({ toolCallId: "call", content: [{ type: "text", text: "ok" }] });
      expect(out.content).toHaveLength(2);
      expect(out.content[1].text).toContain("301");
      expect(result({ toolCallId: "call", content: [] })).toBeUndefined();
    });
  });
  test("resolves input.cwd against the session folder", () => {
    withRepo(1, (cwd) => {
      const parent = join(cwd, "..");
      expect(hook().call(create({ cwd: cwd.slice(parent.length + 1) }), { cwd: parent }).block).toBe(true);
    });
  });
  test("fails open and logs when git cannot answer", () => {
    const outside = mkdtempSync(join(tmpdir(), "pr-gate-outside-"));
    try {
      const { call, errors } = hook();
      expect(call(create(), { cwd: outside })).toBeUndefined();
      expect(errors).toHaveLength(1);
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });
});
