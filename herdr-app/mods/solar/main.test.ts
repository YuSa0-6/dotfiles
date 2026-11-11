// Herdr の中でしか動かない mod を、Herdr なしで確かめるためのテスト。
// 画面の部品（gpui-kit）と Herdr の関数（herdr）を、呼ばれた内容を覚えるだけの偽物に差し替える。
// 実行：このフォルダで `bun test`
import { beforeEach, describe, expect, mock, test } from "bun:test";

type Handler = (...args: any[]) => void;

interface Node {
  kind: string;
  ident: string;
  kids: unknown[];
  calls: Record<string, unknown[]>;
  handlers: Record<string, Handler>;
}

// どのメソッドを呼んでも自分を返す部品。id・子・押したときの処理だけ覚える。
function el(kind: string): any {
  const node: Node = { kind, ident: "", kids: [], calls: {}, handlers: {} };
  const proxy: any = new Proxy(node, {
    get(target, key: string) {
      if (key in target) return (target as any)[key];
      return (...args: unknown[]) => {
        target.calls[key] = args;
        if (key === "id") target.ident = String(args[0]);
        if (key === "child") target.kids.push(args[0]);
        if (key === "children") target.kids.push(...(args[0] as unknown[]));
        if (key.startsWith("on_")) target.handlers[key] = args[0] as Handler;
        return proxy;
      };
    },
  });
  return proxy;
}

const isNode = (value: unknown): value is Node => typeof value === "object" && value !== null && "kids" in value;

function walk(root: Node): Node[] {
  return [root, ...root.kids.filter(isNode).flatMap(walk)];
}

function texts(root: Node): string[] {
  return walk(root).flatMap((n) => n.kids.filter((k): k is string => typeof k === "string"));
}

function find(root: Node, id: string): Node {
  const hit = walk(root).find((n) => n.ident === id);
  if (!hit) throw new Error(`id ${id} の部品がない`);
  return hit;
}

const ids = (root: Node): string[] => walk(root).map((n) => n.ident).filter(Boolean);

const host = {
  props: {} as Record<string, unknown>,
  shared: {} as Record<string, any>,
  spaces: [] as any[],
  agents: [] as any[],
  machines: [{ name: null, layout: "ready" }] as any[],
  ran: [] as [string, any][],
  terminals: [] as any[],
  overlays: [] as any[],
  execs: [] as [string, string[]][],
  closed: [] as string[],
  sent: [] as string[][],
  notes: [] as any[],
  draft: "",
};
const draftHandlers: Record<string, Handler> = {};

mock.module("herdr", () => ({
  props: () => host.props,
  shared: (key: string) => host.shared[key],
  setShared: (key: string, value: unknown) => { host.shared[key] = value; return null; },
  spaces: () => host.spaces,
  agents: () => host.agents,
  machines: () => host.machines,
  theme: () => ({ foreground: "#000", dim: "#999", blocked: "#cc0", done: "#0c0" }),
  terminals: () => host.terminals,
  openOverlay: (spec: unknown) => { host.overlays.push(spec); return "o1"; },
  closeOverlay: (id: string) => { host.closed.push(id); return null; },
  run: (name: string, args: unknown) => { host.ran.push([name, args]); return null; },
  hc: async (args: string[]) => { host.sent.push(args); return { code: 0, stdout: "", stderr: "" }; },
  exec: async (command: string, args: string[]) => { host.execs.push([command, args]); return { code: 0, stdout: "", stderr: "" }; },
  home: () => "/home/u",
  appHome: () => "/home/u/.config/herdr-app",
  notify: (note: unknown) => { host.notes.push(note); return "n1"; },
}));
mock.module("gpui-kit", () => ({
  View: class {},
  div: () => el("div"),
  image: () => el("image"),
  svg: () => el("svg"),
}));
mock.module("gpui-base", () => ({
  h_flex: () => el("h_flex"),
  v_flex: () => el("v_flex"),
  Textarea: { new: () => el("textarea") },
  TextareaState: {
    new: () => ({
      value: () => host.draft,
      set_value: (next: string) => { host.draft = next; },
      on: (event: string, handler: Handler) => { draftHandlers[event] = handler; return true; },
    }),
  },
}));

const { default: Solar, assign } = await import("./main.ts");

interface Timer { ms: number; run: Handler }

function mount(props: Record<string, unknown>): { view: any; timers: Timer[]; cx: any; notified: () => number } {
  host.props = props;
  const timers: Timer[] = [];
  let count = 0;
  const cx = { notify: () => { count++; }, timer: { every: (ms: number, run: Handler) => { timers.push({ ms, run }); } } };
  const view = new Solar();
  view.init(undefined, cx);
  return { view, timers, cx, notified: () => count };
}

// 太陽系は、大きさが分かるまで背景だけを返す。大きさを渡してから描き直す。
function orrery(props: Record<string, unknown>) {
  const mounted = mount(props);
  mounted.view.render().handlers.on_size_change({ width: 1000, height: 800 }, mounted.cx);
  return mounted;
}

const space = (id: string, name: string, status: string | null = null) => ({ id, name, status });
const agent = (spaceId: string, address: string, status: string, app = "claude-code") =>
  ({ space: spaceId, address, status, app, title: `${address}-title`, program: { name: "Claude Code" } });

// 重ねて開いたターミナル。帯（head）とターミナルの2段で開く。
const opened = (): string[] => host.overlays.map((o) => o.layout.children[1].content.terminal);

beforeEach(() => {
  host.props = {};
  host.shared = {};
  host.spaces = [];
  host.agents = [];
  host.machines = [{ name: null, layout: "ready" }];
  host.ran = [];
  host.terminals = [];
  host.overlays = [];
  host.execs = [];
  host.closed = [];
  host.sent = [];
  host.notes = [];
  host.draft = "";
});

describe("枠の割り当て", () => {
  test("新しいスペースは内側の枠から入る", () => {
    expect(assign({}, [], ["a", "b", "c"], 8).slots).toEqual({ a: 1, b: 2, c: 3 });
  });

  test("消えたスペースの枠は空き、ほかは詰めない", () => {
    const r = assign({ a: 1, b: 2, c: 3 }, [], ["a", "c"], 8);
    expect(r.slots).toEqual({ a: 1, c: 3 });
    expect(r.freed).toEqual([2]);
  });

  test("一度も使っていない枠を、空いた枠より先に使う", () => {
    expect(assign({ a: 1, c: 3 }, [2], ["a", "c", "d"], 8).slots.d).toBe(4);
  });

  test("空いた枠は、空いて古い順に使う", () => {
    const full = { c: 3, d: 4, e: 5, f: 6, g: 7, h: 8 };
    expect(assign(full, [2, 1], [...Object.keys(full), "i"], 8).slots.i).toBe(2);
  });

  test("上限を下げても、今ある惑星の枠は変わらない", () => {
    const saved = { a: 1, b: 2, c: 3, d: 4, e: 5 };
    const r = assign(saved, [], Object.keys(saved), 3);
    expect(r.slots).toEqual(saved);
    expect(r.changed).toBe(false);
  });

  test("上限の内側に空きがあれば、未使用の外側より内側を使う", () => {
    expect(assign({ a: 1, d: 4 }, [2, 3], ["a", "d", "x"], 3).slots.x).toBe(2);
  });

  test("上限の内側が埋まっていれば、外側の枠に入る", () => {
    expect(assign({ a: 1, b: 2, c: 3 }, [], ["a", "b", "c", "x"], 3).slots.x).toBe(4);
  });

  test("9個目は枠をもらえない", () => {
    const saved = { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8 };
    expect(assign(saved, [], [...Object.keys(saved), "i"], 8).slots.i).toBeUndefined();
  });
});

describe("太陽系", () => {
  test("大きさが分かるまでは、背景だけを返す", () => {
    const { view } = mount({ demo: true });
    expect(view.render().kids).toEqual([]);
  });

  test("見本では8つの惑星と太陽と月に、押せる範囲がある", () => {
    const root = orrery({ demo: true }).view.render();
    const hits = ids(root).filter((id) => id.endsWith("-hit"));
    expect(hits.filter((id) => id.startsWith("planet-"))).toHaveLength(8);
    expect(hits).toContain("sun-hit");
    expect(hits).toContain("moon-hit");
    expect(texts(root)).toContain("Worker");
  });

  // 見せていない部品は opacity(0) で置いてある。
  const visible = (root: Node, id: string): boolean => find(root, id).calls.opacity?.[0] !== 0;

  test("分類できないAgentの惑星には「？」の印が出る", () => {
    const root = orrery({ demo: true }).view.render();
    expect(visible(root, "planet-d8-badge-unknown")).toBe(true);
    expect(visible(root, "planet-d1-badge-unknown")).toBe(false);
  });

  test("輪と印は、いまの状態のものだけ見せる", () => {
    const root = orrery({ demo: true }).view.render();
    const shown = (space: string): string[] =>
      ["track", "arc", "blocked", "done", "badge-blocked", "badge-done", "badge-idle", "badge-unknown"]
        .filter((part) => visible(root, `planet-${space}-${part}`));
    expect(shown("d1")).toEqual(["track", "arc"]);
    expect(shown("d2")).toEqual(["done", "badge-done"]);
    expect(shown("d3")).toEqual(["blocked", "badge-blocked"]);
    expect(shown("d6")).toEqual(["badge-idle"]);
    expect(shown("d7")).toEqual([]);
  });

  test("作業中から「進めた」に変わっても、輪は同じ部品のまま惑星と一緒に動く", () => {
    host.spaces = [space("a", "one", "working")];
    host.shared["solar.slots"] = { a: 1 };
    const { view } = orrery({});
    const before = find(view.render(), "planet-a-done");
    expect(before.calls.opacity).toEqual([0]);
    expect(before.calls.left).toEqual(find(view.render(), "planet-a-body").calls.left);
    host.spaces = [space("a", "one", "done")];
    expect(visible(view.render(), "planet-a-done")).toBe(true);
  });

  test("回すのは、見せている弧だけ", () => {
    const root = orrery({ demo: true }).view.render();
    expect(find(root, "planet-d1-arc").calls.spin).toEqual([8000]);
    expect(find(root, "planet-d2-arc").calls.spin).toBeUndefined();
  });

  test("惑星を押すと、詳細の列がそのProjectになる", () => {
    const root = orrery({ demo: true }).view.render();
    find(root, "planet-d3-hit").handlers.on_click({ click_count: 1 });
    expect(host.shared["solar.view"]).toEqual({ kind: "project", space: "d3" });
  });

  describe("惑星を2回続けて押す", () => {
    const press = (count: number) => {
      host.shared["solar.slots"] = { a: 1 };
      find(orrery({}).view.render(), "planet-a-hit").handlers.on_click({ click_count: count });
    };

    test("いちばん急ぎのAgentのターミナルを開き、列もそのProjectにする", () => {
      host.spaces = [space("a", "one", "blocked")];
      host.agents = [agent("a", "t1", "working"), agent("a", "t2", "blocked")];
      press(2);
      expect(opened()).toEqual(["t2"]);
      expect(host.shared["solar.view"]).toEqual({ kind: "project", space: "a" });
    });

    test("1回目と3回目では、ターミナルを開かない", () => {
      host.spaces = [space("a", "one", "working")];
      host.agents = [agent("a", "t1", "working")];
      press(1);
      press(3);
      expect(host.ran).toEqual([]);
    });

    test("Agentがいなければ、列に出すだけ", () => {
      host.spaces = [space("a", "one")];
      press(2);
      expect(host.ran).toEqual([]);
      expect(host.shared["solar.view"]).toEqual({ kind: "project", space: "a" });
    });

    test("見本では、ターミナルを開かない", () => {
      find(orrery({ demo: true }).view.render(), "planet-d3-hit").handlers.on_click({ click_count: 2 });
      expect(host.ran).toEqual([]);
    });
  });

  test("太陽と月を押すと、それぞれの列になる", () => {
    const root = orrery({ demo: true }).view.render();
    find(root, "sun-hit").handlers.on_click();
    expect(host.shared["solar.view"]).toEqual({ kind: "sun" });
    find(root, "moon-hit").handlers.on_click();
    expect(host.shared["solar.view"]).toEqual({ kind: "moon" });
  });

  test("sun という名前のスペースは惑星にならない", () => {
    host.spaces = [space("a", "dotfiles", "working"), space("s", "sun", "idle")];
    const root = orrery({}).view.render();
    expect(ids(root)).toContain("planet-a-hit");
    expect(ids(root)).not.toContain("planet-s-hit");
  });

  test("太陽が質問しているときは「!」の印が出る", () => {
    host.spaces = [space("s", "sun", "blocked")];
    host.agents = [agent("s", "t1", "blocked")];
    expect(texts(orrery({}).view.render())).toContain("!");
  });

  test("公転で進むのは作業中の惑星だけ", () => {
    const { view, timers, cx } = orrery({ demo: true });
    timers.find((t) => t.ms === 4000)!.run(cx);
    expect(Object.keys(view.travelled).sort()).toEqual(["d1", "d4", "d5"]);
    expect(view.moon).toBe(24);
  });

  test("動きがオフなら、公転も月も進まない", () => {
    const { view, timers, cx, notified } = orrery({ demo: true, still: true });
    const before = notified();
    timers.find((t) => t.ms === 4000)!.run(cx);
    expect(view.travelled).toEqual({});
    expect(view.moon).toBe(0);
    expect(notified()).toBe(before);
  });

  test("惑星が消えた場所に輪郭が残り、時間がたつと消える", () => {
    host.spaces = [space("a", "one", "idle"), space("b", "two", "idle")];
    const { view } = orrery({});
    view.render();
    host.spaces = [space("a", "one", "idle")];
    view.render();
    expect(view.ghosts).toHaveLength(1);
    view.ghosts[0].until = 0;
    view.render();
    expect(view.ghosts).toHaveLength(0);
  });

  test("「進めた」が idle に変わると、輪が1回だけ広がって消える", () => {
    const { view, timers, cx } = orrery({ demo: true, flip: 1 });
    view.render();
    const second = timers.find((t) => t.ms === 1000)!;
    second.run(cx);
    expect(ids(view.render())).toContain("planet-d2-ripple");
    expect(view.ripples.d2.grown).toBe(false);
    second.run(cx);
    expect(view.ripples.d2.grown).toBe(true);
    view.ripples.d2.until = 0;
    second.run(cx);
    expect(view.ripples.d2).toBeUndefined();
  });
});

describe("枠の保存", () => {
  test("スペースの枠を保存する", () => {
    host.spaces = [space("a", "one"), space("b", "two")];
    mount({});
    expect(host.shared["solar.slots"]).toEqual({ a: 1, b: 2 });
  });

  test("スペースがまだ読めていないあいだは保存しない", () => {
    host.shared["solar.slots"] = { a: 1 };
    host.machines = [{ name: null, layout: "loading" }];
    mount({});
    expect(host.shared["solar.slots"]).toEqual({ a: 1 });
  });

  test("一瞬だけ消えたスペースの枠は空けず、5回続けて見えないと空ける", () => {
    host.spaces = [space("a", "one"), space("b", "two")];
    const { timers, cx } = mount({});
    const second = timers.find((t) => t.ms === 1000)!;
    host.spaces = [space("a", "one")];
    for (let i = 0; i < 3; i++) second.run(cx);
    expect(host.shared["solar.slots"]).toEqual({ a: 1, b: 2 });
    for (let i = 0; i < 3; i++) second.run(cx);
    expect(host.shared["solar.slots"]).toEqual({ a: 1 });
    expect(host.shared["solar.freed"]).toEqual([2]);
    expect(host.shared["solar.closed"]).toBe(1);
  });

  test("列から閉じたスペースの枠は、待たずに空ける", () => {
    host.spaces = [space("a", "one"), space("b", "two")];
    const { timers, cx } = mount({});
    host.shared["solar.closing"] = { b: Date.now() };
    host.spaces = [space("a", "one")];
    timers.find((t) => t.ms === 1000)!.run(cx);
    expect(host.shared["solar.slots"]).toEqual({ a: 1 });
  });
});

describe("詳細の列：ホーム", () => {
  test("待っている惑星があれば、その惑星を開くボタンが出る", () => {
    const root = mount({ role: "detail", demo: true }).view.render();
    expect(texts(root)).toContain("Worker（待ってる）");
    find(root, "open-caller").handlers.on_click({}, {});
    expect(host.shared["solar.view"]).toEqual({ kind: "project", space: "d3" });
  });

  test("呼んでいる惑星がなければ「いまは静かです」", () => {
    host.spaces = [space("a", "one", "working")];
    host.shared["solar.slots"] = { a: 1 };
    expect(texts(mount({ role: "detail" }).view.render())).toContain("いまは静かです");
  });
});

describe("詳細の列：Project", () => {
  const open = (id: string) => {
    host.shared["solar.slots"] = { a: 1 };
    host.shared["solar.view"] = { kind: "project", space: id };
    return mount({ role: "detail" });
  };

  test("待っているProjectは、列を黄色で囲む", () => {
    const root = mount({ role: "detail", demo: true, view: "d3" }).view.render();
    expect(texts(root)).toContain("待ってる・Agent 1体");
    expect(root.calls.border).toEqual([2]);
  });

  test("「ターミナルを開く」で、選んだAgentを peek する", () => {
    host.spaces = [space("a", "one", "working")];
    host.agents = [agent("a", "t1", "working")];
    find(open("a").view.render(), "peek").handlers.on_click({}, {});
    expect(opened()).toEqual(["t1"]);
  });

  test("Agentが2体以上なら、いちばん急ぎを選んでおき、行を押すと選び直せる", () => {
    host.spaces = [space("a", "one", "blocked")];
    host.agents = [agent("a", "t1", "working"), agent("a", "t2", "blocked")];
    const { view, cx } = open("a");
    find(view.render(), "peek").handlers.on_click({}, cx);
    find(view.render(), "agent-t1").handlers.on_click({}, cx);
    find(view.render(), "peek").handlers.on_click({}, cx);
    expect(opened()).toEqual(["t2", "t1"]);
  });

  test("「閉じる」は1回目では閉じず、2回目で閉じる", () => {
    host.spaces = [space("a", "one", "idle")];
    const { view, cx } = open("a");
    find(view.render(), "close").handlers.on_click({}, cx);
    expect(host.ran).toEqual([]);
    expect(texts(view.render())).toContain("本当に閉じる（元に戻せません）");
    find(view.render(), "close").handlers.on_click({}, cx);
    expect(host.ran).toEqual([["space.close", { id: "a", confirmed: true }]]);
    expect(Object.keys(host.shared["solar.closing"])).toEqual(["a"]);
    expect(host.shared["solar.view"]).toEqual({ kind: "home" });
  });

  test("別の画面に移ると、「閉じる」の1回目は取り消される", () => {
    host.spaces = [space("a", "one", "idle")];
    const { view, cx } = open("a");
    find(view.render(), "close").handlers.on_click({}, cx);
    host.shared["solar.view"] = { kind: "home" };
    view.render();
    host.shared["solar.view"] = { kind: "project", space: "a" };
    expect(texts(view.render())).toContain("このProjectを閉じる");
  });
});

describe("詳細の列：太陽", () => {
  const sun = (status: string | null) => {
    host.spaces = [space("s", "sun", status)];
    host.agents = status ? [agent("s", "t9", status)] : [];
    host.shared["solar.view"] = { kind: "sun" };
    return mount({ role: "detail" });
  };

  test("太陽のスペースがなければ、起こすボタンが出る", () => {
    host.shared["solar.view"] = { kind: "sun" };
    const root = mount({ role: "detail" }).view.render();
    expect(texts(root)).toContain("太陽がまだいません");
    expect(ids(root)).toContain("wake");
  });

  test("太陽のスペースにAgentがいなければ、止まっていると伝える", () => {
    expect(texts(sun(null).view.render())).toContain("太陽が止まっています");
  });

  test("太陽が質問しているときは、入力欄の代わりにターミナルを開く", () => {
    const root = sun("blocked").view.render();
    find(root, "peek-sun").handlers.on_click({}, {});
    expect(opened()).toEqual(["t9"]);
  });

  test("太陽がいれば、列のボタンでターミナルを開く", async () => {
    find(sun("idle").view.render(), "peek-sun").handlers.on_click({}, {});
    await Promise.resolve();
    expect(opened()).toEqual(["t9"]);
  });
});

describe("太陽に頼む", () => {
  const press = async (status: string | null) => {
    host.spaces = [space("s", "sun", status)];
    host.agents = status ? [agent("s", "t9", status)] : [];
    find(orrery({}).view.render(), "sun-hit").handlers.on_click();
    await Promise.resolve();
    await Promise.resolve();
  };

  test("手が空いている太陽には /clear を送ってから、ターミナルを開く", async () => {
    await press("idle");
    expect(host.sent).toEqual([["keys", "t9", "/", "c", "l", "e", "a", "r", "enter"]]);
    expect(opened()).toEqual(["t9"]);
  });

  test("作業中・質問中の太陽は、消さずにそのまま開く", async () => {
    await press("working");
    await press("blocked");
    expect(host.sent).toEqual([]);
    expect(opened()).toEqual(["t9", "t9"]);
  });

  test("太陽がいなければ、列に太陽の画面を出す", async () => {
    await press(null);
    expect(opened()).toEqual([]);
    expect(host.shared["solar.view"]).toEqual({ kind: "sun" });
  });
});

describe("詳細の列：月（設定）", () => {
  const settings = () => {
    host.shared["solar.view"] = { kind: "moon" };
    return mount({ role: "detail" });
  };

  test("上限は1〜8の範囲で増減できる", () => {
    const { view } = settings();
    find(view.render(), "limit-up").handlers.on_click();
    expect(host.shared["solar.limit"]).toBeUndefined();
    find(view.render(), "limit-down").handlers.on_click();
    expect(host.shared["solar.limit"]).toBe(7);
  });

  test("動きをオフ・オンに切り替えられる", () => {
    const { view } = settings();
    find(view.render(), "move-off").handlers.on_click();
    expect(host.shared["solar.still"]).toBe(true);
    find(view.render(), "move-on").handlers.on_click();
    expect(host.shared["solar.still"]).toBe(false);
  });
});

describe("状態の帯", () => {
  test("軌道に出ている惑星の数と上限を出す", () => {
    expect(texts(mount({ role: "bar", demo: true }).view.render())).toContain("8 / 8");
  });

  test("数が上限を超えても、今ある惑星を数える", () => {
    expect(texts(mount({ role: "bar", demo: true, limit: 5 }).view.render())).toContain("8 / 5");
  });
});

describe("太陽を自動で起こす", () => {
  const seconds = async (mounted: { timers: Timer[]; cx: any }, n: number) => {
    const every = mounted.timers.filter((t) => t.ms === 1000);
    for (let i = 0; i < n; i++) every.forEach((t) => t.run(mounted.cx));
    await new Promise((done) => setTimeout(done, 0));
  };
  const woke = () => host.ran.filter(([name]) => name === "space.new");

  test("太陽がいない状態が3秒続くと、太陽を1回だけ起こす", async () => {
    const mounted = mount({});
    await seconds(mounted, 2);
    expect(woke()).toHaveLength(0);
    await seconds(mounted, 4);
    expect(woke()).toHaveLength(1);
    expect(woke()[0][1].name).toBe("sun");
    expect(woke()[0][1].folder).toBe("/home/u/workspace/solar");
  });

  test("太陽がすでにいれば起こさない。あとで閉じても戻さない", async () => {
    host.spaces = [space("s", "sun")];
    const mounted = mount({});
    await seconds(mounted, 1);
    host.spaces = [];
    await seconds(mounted, 5);
    expect(woke()).toHaveLength(0);
  });

  test("スペースを読み込んでいる間は起こさない", async () => {
    host.machines = [{ name: null, layout: "loading" }];
    const mounted = mount({});
    await seconds(mounted, 5);
    expect(woke()).toHaveLength(0);
  });

  test("見本と、詳細の列・帯では起こさない", async () => {
    for (const props of [{ demo: true }, { role: "detail" }, { role: "bar" }]) {
      const mounted = mount(props);
      await seconds(mounted, 5);
    }
    expect(woke()).toHaveLength(0);
  });
});

describe("ターミナルの上の帯", () => {
  test("開いたターミナルの上に、帯とターミナルを重ねる", () => {
    host.spaces = [space("a", "alpha", "blocked")];
    host.agents = [agent("a", "t1", "blocked")];
    host.shared["solar.view"] = { kind: "project", space: "a" };
    find(mount({ role: "detail" }).view.render(), "peek").handlers.on_click();
    const [head, body] = host.overlays[0].layout.children;
    expect(head.content).toEqual({ mod: "solar", props: { role: "head", terminal: "t1" } });
    expect(body.content).toEqual({ terminal: "t1" });
  });

  test("動いているプログラムのフォルダ名と、ホームからの場所を出す", () => {
    host.terminals = [{ address: "t1", cwd: "/home/u", foreground: { cwd: "/home/u/workspace/solar/alpha" } }];
    const root = mount({ role: "head", terminal: "t1", overlay: "o9" }).view.render();
    expect(texts(root)).toContain("alpha");
    expect(texts(root)).toContain("~/workspace/solar/alpha");
  });

  test("✕ を押すと、重ねた画面を閉じる", () => {
    const root = mount({ role: "head", terminal: "t1", overlay: "o9" }).view.render();
    find(root, "close-terminal").handlers.on_click();
    expect(host.closed).toEqual(["o9"]);
  });
});

describe("端の灯り", () => {
  const lamp = () => mount({ role: "lamp" }).view.render();

  test("待ってる数と進めた数だけを出す", () => {
    host.spaces = [space("a", "alpha", "blocked"), space("b", "beta", "done"), space("c", "gamma", "working")];
    expect(texts(lamp())).toEqual(["待ってる", "1", "進めた", "1"]);
  });

  test("0 のときも同じ項目を出す", () => {
    host.spaces = [space("a", "alpha", "working")];
    expect(texts(lamp())).toEqual(["待ってる", "0", "進めた", "0"]);
  });

  test("押すと Solar に切り替える", () => {
    find(lamp(), "lamp").handlers.on_click();
    expect(host.ran).toEqual([["layout.switch", { name: "solar" }]]);
  });

  test("Solar を開いていない間も、枠を保存する", () => {
    host.spaces = [space("a", "alpha")];
    mount({ role: "lamp" });
    expect(host.shared["solar.slots"]).toEqual({ a: 1 });
  });
});

describe("軌道の外", () => {
  const nine = () => { host.spaces = "abcdefghi".split("").map((id) => space(id, `p-${id}`)); };

  test("枠をもらえないスペースがあると、帯と灯りに数を出す", () => {
    nine();
    expect(texts(mount({ role: "bar" }).view.render())).toContain("軌道の外");
    const lamp = texts(mount({ role: "lamp" }).view.render());
    expect(lamp.slice(-2)).toEqual(["軌道の外", "1"]);
  });

  test("全部が軌道に乗っていれば出さない", () => {
    host.spaces = [space("a", "alpha")];
    expect(texts(mount({ role: "bar" }).view.render())).not.toContain("軌道の外");
    expect(texts(mount({ role: "lamp" }).view.render())).not.toContain("軌道の外");
  });
});

describe("閉じたProjectの記録", () => {
  const records = () => host.execs.filter(([command]) => command === "sh");

  test("閉じたProjectの日付・名前・フォルダを、1行でファイルに足す", () => {
    host.spaces = [{ ...space("a", "alpha"), folder: "/home/u/workspace/solar/alpha" }, space("b", "beta")];
    const mounted = mount({});
    host.spaces = [space("b", "beta")];
    const every = mounted.timers.filter((t) => t.ms === 1000);
    for (let i = 0; i < 6; i++) every.forEach((t) => t.run(mounted.cx));
    expect(records()).toHaveLength(1);
    const [, , , dir, line, file] = records()[0][1];
    expect(dir).toBe("/home/u/.config/herdr-app/data/solar");
    expect(file).toBe("closed.tsv");
    expect(line).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}\talpha\t\/home\/u\/workspace\/solar\/alpha$/);
    expect(host.shared["solar.known"]).toEqual({ b: { name: "beta", folder: "" } });
  });

  test("閉じていなければ書かない", () => {
    host.spaces = [space("a", "alpha")];
    const mounted = mount({});
    mounted.timers.filter((t) => t.ms === 1000).forEach((t) => t.run(mounted.cx));
    expect(records()).toHaveLength(0);
  });
});
