// Herdrが読むのは main.js だけ。このファイルを直したら、このフォルダで
// `bunx -p typescript@latest tsc -p .` を実行して main.js を作り直す。
import { View, div, image, svg } from "gpui-kit";
import { h_flex, v_flex, Textarea, TextareaState } from "gpui-base";
import { spaces, agents, machines, props, shared, setShared, run, hc, exec, home, appHome, notify } from "herdr";
const ART = "mods/solar";
const BG = "#0E0F11";
const LINE = "#2A2C31";
const CROSS = "#1D1F24";
const ORBIT = "#3A3D45";
const ORBIT_OFF = "#24262B";
const TEXT = "#E4E5E9";
const TEXT_DIM = "#B4B7BF";
const TEXT_FAINT = "#9A9DA6";
const BLOCKED = "#FFD66B";
const BLOCKED_NAME = "#FFE9A8";
const ON_BLOCKED = "#3A2E00";
const DONE = "#7FD9B4";
const ON_DONE = "#0B3B2A";
const BADGE = "#5A5D66";
// 元に戻せない操作の、2回目の確認だけに使う色。状態の色（黄・緑）とは混ぜない。
const DANGER = "#E5746A";
const ON_DANGER = "#3A0D09";
const ARC = "#D5D7DD";
const MONO = "JetBrains Mono";
const SLOTS = 8;
// 太陽系の正方形は、箱の短い辺より少し小さくする。いちばん外の惑星の名前と衛星の輪が端で切れないようにするため。
const FIT = 0.92;
const RADII = [0.125, 0.171, 0.217, 0.263, 0.308, 0.354, 0.400, 0.446];
const SUN_SIZE = 0.12;
const SUN_NAME = "sun";
// 太陽が質問しているときの輪と印の色。状態の黄色とは別にする。
const SUN_ASKS = "#F4F1E6";
// 太陽が新しいProjectのフォルダを作る場所（ホームからの相対）。太陽はここで起動する。
const PROJECTS = "workspace/solar";
// 太陽に許すコマンド。これ以外を実行しようとすると、太陽は止まって聞いてくる。
const SUN_TOOLS = ["Bash(mkdir *)", "Bash(herdr-app do space.new *)"];
const PLANETS = ["mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune"];
const PROVIDERS = {
    "claude-code": { name: "Claude", color: "#D97757" },
    codex: { name: "Codex", color: "#7CC4F5" },
    pi: { name: "Pi", color: "#A8ABB3" },
};
const PROVIDER_OTHER = { name: "その他", color: "#B79CF0" };
const DIM = 0.6;
const NAME_WIDTH = 160;
const NAME_HEIGHT = 18;
const WORDS = { blocked: "待ってる", done: "進めた", working: "作業中", idle: "休止中", unknown: "不明" };
// 急ぎの順。小さいほど先に見せる。
const URGENCY = { blocked: 0, done: 1, working: 2, idle: 3, unknown: 4 };
const rad = (deg) => (deg * Math.PI) / 180;
// 枠ごとの初期角度（度、右向きが0で時計回り）。隣の枠どうしで名前が重ならないよう、
// 黄金角でずらした固定値にしている。
const SLOT_ANGLE = RADII.map((_, i) => (200 + i * 137.5) % 360);
const SATELLITE_START = 140;
const MOON_START = 225;
// 名前の上下は、水平線の前後この角度では切り替えない。行ったり来たりを防ぐ。
const FLIP_GUARD = Math.sin(rad(10));
// 公転は毎フレーム描き直さず、TICKごとに次の位置を決めて同じ時間をかけて直線で移す。
const TICK = 4000;
const GLIDE = { duration: TICK, easing: "linear" };
const MOON_STEP = 24;
// 「進めた」が消えるときの、輪が広がる動き。
const RIPPLE = { duration: 900, easing: "ease-out" };
// いちばん内側で1周 約2分（120秒）、外側ほど遅い（周期は半径の1.5乗に比例）。
const ORBIT_STEP = RADII.map((r) => (360 * (TICK / 1000)) / (120 * (r / RADII[0]) ** 1.5));
// 保存は1秒ごと。この回数だけ続けて見えなかったスペースの枠を空ける。
const RELEASE_AFTER = 5;
// 惑星が消えた場所に、輪郭を残す時間。
const GHOST = 6000;
// 列から閉じたスペースは、この時間だけ「すぐ枠を空けてよい」と覚えておく。
const CLOSING = 10000;
const DEMO_SPACES = [
    { id: "d1", name: "SWG", status: "working" },
    { id: "d2", name: "Docs", status: "done" },
    { id: "d3", name: "Worker", status: "blocked" },
    { id: "d4", name: "Herdr", status: "working" },
    { id: "d5", name: "PeerX", status: "working" },
    { id: "d6", name: "Infra", status: "idle" },
    { id: "d7", name: "Design", status: null },
    { id: "d8", name: "Research", status: "unknown" },
];
const DEMO_AGENTS = [
    { space: "d1", address: "demo1", name: "swg-main", app: "claude-code", status: "working" },
    { space: "d2", address: "demo2", name: "docs-writer", app: "codex", status: "done" },
    { space: "d3", address: "demo3", name: "worker-cdx-12", app: "claude-code", status: "blocked" },
    { space: "d4", address: "demo4", name: "herdr-mod", app: "pi", status: "working" },
    { space: "d5", address: "demo5", name: "peerx-api", app: "codex", status: "working" },
    { space: "d5", address: "demo6", name: "peerx-review", app: "codex", status: "idle" },
    { space: "d5", address: "demo7", name: "peerx-ui", app: "omp", status: "working" },
    { space: "d6", address: "demo8", name: "infra-plan", app: "claude-code", status: "idle" },
    { space: "d8", address: "demo9", name: "research", app: "omp", status: "unknown" },
];
// 枠の割り当て。一度決めた枠は変えず、詰めない。新しいスペースは
// 「一度も使っていない枠（内側から）」→「空いて古い順」で入れる。
// 上限の内側に空きがあれば内側を先に使い、なければ外側の枠に入れる。
// 上限が止めるのは太陽への依頼だけで、Herdr本体で作られたスペースは8個まで惑星にする。
function assign(saved, freed, ids, limit) {
    const alive = new Set(ids);
    const slots = {};
    const nextFreed = [...freed];
    let changed = false;
    for (const [id, slot] of Object.entries(saved)) {
        if (alive.has(id)) {
            slots[id] = slot;
        }
        else {
            changed = true;
            if (!nextFreed.includes(slot))
                nextFreed.push(slot);
        }
    }
    for (const id of ids) {
        if (slots[id])
            continue;
        const taken = new Set(Object.values(slots));
        const open = [];
        for (let s = 1; s <= SLOTS; s++)
            if (!taken.has(s))
                open.push(s);
        if (open.length === 0)
            break;
        const rank = (s) => (s > limit ? SLOTS + 1 : 0) + (nextFreed.includes(s) ? 1 + nextFreed.indexOf(s) : 0);
        open.sort((a, b) => rank(a) - rank(b) || a - b);
        const slot = open[0];
        slots[id] = slot;
        const at = nextFreed.indexOf(slot);
        if (at >= 0)
            nextFreed.splice(at, 1);
        changed = true;
    }
    return { slots, freed: nextFreed, changed };
}
export default class Solar extends View {
    size = null;
    // スペースごとに、初期角度から進んだ分（度）。再起動で初期角度に戻る。
    travelled = {};
    moon = 0;
    // 保存済みなのに一覧にないスペースが、何回続けて見えなかったか。
    missing = {};
    // スペースごとに、名前を惑星の上に出しているか。
    above = {};
    // 詳細の列で、スペースごとに選んでいるAgent。
    picked = {};
    // 詳細の列の、太陽に頼む文の入力欄。
    draft = null;
    text = "";
    // 詳細の列で、「閉じる」を1回押してあるスペース。
    arming = null;
    // 前の描画で軌道に出ていたスペースと、その枠。消えた惑星を見つけるために持つ。
    seen = {};
    // 前の描画でのスペースの状態。done から idle に変わった瞬間を見つけるために持つ。
    statuses = {};
    // 広がって消える輪。まず元の大きさで1回描き、次に広がった姿を描くことで動きになる。
    ripples = {};
    // 見本で、「進めた」を idle に変えたか。変えるまでの秒数も数える。
    flipped = false;
    age = 0;
    // 消えた惑星の輪郭。
    ghosts = [];
    init(_props, cx) {
        if (this.role() === "detail") {
            this.draft = TextareaState.new({ placeholder: "頼みたいことを書く", rows: 6 });
            this.draft.on("change", (_event, cx) => { this.text = this.draft?.value() ?? ""; cx.notify(); });
        }
        if (this.role() !== "solar")
            return;
        cx.timer.every(TICK, (cx) => this.tick(cx));
        // 保存は太陽系のコピーだけが行う。render中のsetSharedは再描画のループになるので、
        // ここと低頻度のタイマーから書く。
        if (!this.demo())
            this.persist();
        cx.timer.every(1000, (cx) => {
            if (!this.demo())
                this.persist();
            // 輪郭を消す時刻が来たときと、輪の動きを進めるときだけ描き直す。
            const now = Date.now();
            let dirty = this.ghosts.some((g) => g.until <= now);
            const flip = Number(props()?.flip ?? 0);
            if (this.demo() && flip > 0 && !this.flipped && ++this.age >= flip) {
                this.flipped = true;
                dirty = true;
            }
            for (const [id, ripple] of Object.entries(this.ripples)) {
                if (!ripple.grown) {
                    ripple.grown = true;
                    ripple.until = now + RIPPLE.duration;
                    dirty = true;
                }
                else if (now > ripple.until) {
                    delete this.ripples[id];
                    dirty = true;
                }
            }
            if (dirty)
                cx.notify();
        });
    }
    role() {
        return props()?.role ?? "solar";
    }
    demo() {
        return Boolean(props()?.demo);
    }
    // 設定の値。レイアウトの props に同じ名前があれば、そちらを使う（見た目の確認用）。
    setting(key) {
        return props()?.[key] ?? shared(`solar.${key}`);
    }
    limit() {
        const n = Number(this.setting("limit") ?? SLOTS);
        return Math.min(SLOTS, Math.max(1, Number.isFinite(n) ? Math.round(n) : SLOTS));
    }
    // 太陽（依頼を受けるAgent）のスペースは惑星にしない。名前で見分ける。
    bodies() {
        if (!this.demo())
            return spaces().filter((s) => s.name !== SUN_NAME);
        // 見本では、props の flip（秒）がたつと「進めた」の惑星を idle に変える。輪が消える動きの確認用。
        return this.flipped ? DEMO_SPACES.map((s) => (s.status === "done" ? { ...s, status: "idle" } : s)) : DEMO_SPACES;
    }
    // 太陽は、sun という名前のスペースにいるAgent。スペースはあるのにAgentがいないこともある。
    sun() {
        if (this.demo())
            return { space: true, agent: { space: "sun", address: "demo-sun", name: "sun", app: "claude-code", status: "idle" } };
        const space = spaces().find((s) => s.name === SUN_NAME);
        if (!space)
            return { space: false, agent: null };
        const a = agents().find((a) => a.space === space.id);
        return { space: true, agent: a ? { space: a.space, address: a.address, name: a.title || a.program.name, app: a.app, status: a.status } : null };
    }
    crews() {
        const list = this.demo()
            ? DEMO_AGENTS
            : agents().map((a) => ({ space: a.space, address: a.address, name: a.title || a.program.name, app: a.app, status: a.status }));
        const crews = new Map();
        for (const agent of list) {
            const crew = crews.get(agent.space);
            if (crew)
                crew.push(agent);
            else
                crews.set(agent.space, [agent]);
        }
        return crews;
    }
    assignment(list) {
        const ids = list.map((s) => s.id);
        if (this.demo())
            return assign({}, [], ids, this.limit());
        return assign((shared("solar.slots") ?? {}), (shared("solar.freed") ?? []), ids, this.limit());
    }
    // 軌道に出ている惑星だけ。枠をもらえなかった9個目以降は、どの画面でも数えない。
    // 上限を下げても、今ある惑星は消さない。隠すと、そのAgentが待っていても気づけなくなるため。
    shown() {
        const list = this.bodies();
        const { slots } = this.assignment(list);
        return list.filter((s) => slots[s.id]).sort((a, b) => slots[a.id] - slots[b.id]);
    }
    // 上限の内側に、空いた枠がないか。太陽に新しく頼めるかどうかを決める。
    full() {
        const list = this.bodies();
        const { slots } = this.assignment(list);
        const limit = this.limit();
        return list.filter((s) => slots[s.id] && slots[s.id] <= limit).length >= limit;
    }
    persist() {
        // 起動直後はスペースがまだ読めていないことがある。そこで保存すると全部の枠を空けてしまう。
        if (machines().some((m) => m.layout === "loading"))
            return;
        if (spaces().length === 0)
            return;
        // レイアウトの切り替え直後などに、スペースが一瞬だけ一覧から消えることがある。
        // そこで枠を空けると惑星が入れ替わるので、続けて見えないときだけ空ける。
        const ids = this.bodies().map((s) => s.id);
        const alive = new Set(ids);
        const saved = (shared("solar.slots") ?? {});
        const missing = {};
        for (const id of Object.keys(saved)) {
            if (!alive.has(id))
                missing[id] = (this.missing[id] ?? 0) + 1;
        }
        this.missing = missing;
        // 列の「閉じる」で閉じたスペースは、待たずに空ける。
        const closing = (shared("solar.closing") ?? {});
        const fresh = Object.entries(closing).filter(([id, at]) => alive.has(id) && Date.now() - at < CLOSING);
        if (fresh.length !== Object.keys(closing).length)
            setShared("solar.closing", Object.fromEntries(fresh));
        const held = Object.keys(missing).filter((id) => missing[id] < RELEASE_AFTER && !(id in closing));
        const r = assign(saved, (shared("solar.freed") ?? []), [...ids, ...held], this.limit());
        if (!r.changed)
            return;
        setShared("solar.slots", r.slots);
        setShared("solar.freed", r.freed);
        // 枠が空いた数だけ「閉じたProject」を増やす。Herdr本体で閉じたスペースも数える。
        const released = Object.keys(saved).filter((id) => !(id in r.slots)).length;
        if (released > 0)
            setShared("solar.closed", Number(shared("solar.closed") ?? 0) + released);
    }
    tick(cx) {
        if (this.setting("still"))
            return;
        const list = this.bodies();
        const { slots } = this.assignment(list);
        for (const space of list) {
            const slot = slots[space.id];
            if (!slot || space.status !== "working")
                continue;
            this.travelled[space.id] = (this.travelled[space.id] ?? 0) + ORBIT_STEP[slot - 1];
        }
        this.moon += MOON_STEP;
        cx.notify();
    }
    render() {
        const role = this.role();
        if (role === "detail")
            return this.detail();
        if (role === "bar")
            return this.bar();
        const root = div().id("solar-root").relative().size_full().bg(BG).overflow_hidden()
            .on_size_change((size, cx) => { this.size = size; cx.notify(); });
        if (!this.size || !(this.size.width > 0) || !(this.size.height > 0))
            return root;
        const S = FIT * Math.min(this.size.width, this.size.height);
        const cx0 = this.size.width / 2;
        const cy0 = this.size.height / 2;
        const at = (slot, travelled = 0) => {
            const r = RADII[slot - 1] * S;
            const a = rad(SLOT_ANGLE[slot - 1] + travelled);
            return { x: cx0 + r * Math.cos(a), y: cy0 + r * Math.sin(a) };
        };
        const list = this.bodies();
        const { slots } = this.assignment(list);
        const limit = this.limit();
        const crews = this.crews();
        const parts = [
            div().absolute().left(cx0 - S / 2).top(cy0).w(S).h(1).bg(CROSS),
            div().absolute().left(cx0).top(cy0 - S / 2).w(1).h(S).bg(CROSS),
        ];
        // 惑星がいる軌道は、上限の外でも実線のままにする。
        const used = new Set(list.map((s) => slots[s.id]));
        for (let i = 0; i < SLOTS; i++) {
            const ring = disc(cx0, cy0, 2 * RADII[i] * S).border(1);
            parts.push(i < limit || used.has(i + 1) ? ring.border_color(ORBIT) : ring.border_color(ORBIT_OFF).border_dashed());
        }
        // 太陽自身の状態。Agentがいなければ暗くし、作業中は弧、質問中は白っぽい太い輪と「！」。
        const still = Boolean(this.setting("still"));
        const sun = this.sun().agent;
        const sunSize = SUN_SIZE * S;
        const star = pic("sun", cx0, cy0, sunSize);
        parts.push(sun ? star : star.opacity(DIM));
        if (sun?.status === "working") {
            const ring = 1.3 * sunSize;
            const arc = svg(`${ART}/ring-arc.svg`).absolute().left(cx0 - ring / 2).top(cy0 - ring / 2).size(ring).text_color(ARC);
            parts.push(still ? arc : arc.spin(8000));
        }
        if (sun?.status === "blocked") {
            parts.push(disc(cx0, cy0, 1.2 * sunSize).border(4).border_color(SUN_ASKS));
            const mark = 0.3 * sunSize;
            parts.push(h_flex().absolute().left(cx0 + 0.42 * sunSize - mark / 2).top(cy0 - 0.42 * sunSize - mark / 2).size(mark)
                .rounded(0.28 * mark).bg(SUN_ASKS).items_center().justify_center()
                .text_size(0.7 * mark).font_bold().text_color(BG).child("!"));
        }
        parts.push(disc(cx0, cy0, sunSize).id("sun-hit").cursor_pointer().on_click(() => setShared("solar.view", { kind: "sun" })));
        const d = Math.max(44, 0.08 * S);
        // 月は枠3の位置を中心に回る。枠3が空でも、枠3の軌道上に出す。
        let earth = at(3);
        const live = {};
        for (const space of list) {
            const slot = slots[space.id];
            if (!slot)
                continue;
            const p = at(slot, this.travelled[space.id] ?? 0);
            if (slot === 3)
                earth = p;
            live[space.id] = slot;
            // 名前は太陽と反対側に出す。水平線の近くでは、前の側のままにする。
            const dy = p.y - cy0;
            const before = this.above[space.id];
            const above = before !== undefined && Math.abs(dy) < FLIP_GUARD * RADII[slot - 1] * S ? before : dy < 0;
            this.above[space.id] = above;
            planet(parts, space, slot, crews.get(space.id) ?? [], p, d, above, still);
            // 「進めた」を人が見ると idle に変わる。その瞬間に、緑の輪が外へ広がって消える動きを1回だけ出す。
            if (this.statuses[space.id] === "done" && space.status === "idle")
                this.ripples[space.id] = { grown: false, until: 0 };
            this.statuses[space.id] = space.status;
            const ripple = this.ripples[space.id];
            if (ripple) {
                const size = (ripple.grown ? 1.8 : 0.92) * d;
                parts.push(disc(p.x, p.y, size).id(`planet-${space.id}-ripple`).border(2).border_color(DONE).opacity(ripple.grown ? 0 : 1)
                    .transition("width", RIPPLE).transition("height", RIPPLE).transition("left", RIPPLE).transition("top", RIPPLE).transition("opacity", RIPPLE));
            }
        }
        // 惑星が消えた場所に、点線の輪郭をしばらく残す。同じ枠に次の惑星が入ったら消す。
        const now = Date.now();
        for (const [id, slot] of Object.entries(this.seen)) {
            if (!(id in live))
                this.ghosts.push({ slot, travelled: this.travelled[id] ?? 0, until: now + GHOST });
        }
        this.seen = live;
        const taken = new Set(Object.values(live));
        this.ghosts = this.ghosts.filter((g) => g.until > now && !taken.has(g.slot));
        for (const g of this.ghosts) {
            const p = at(g.slot, g.travelled);
            parts.push(disc(p.x, p.y, 0.6 * d).border(1).border_color(TEXT_FAINT).border_dashed());
        }
        const m = rad(MOON_START + this.moon);
        const mx = earth.x + 0.085 * S * Math.cos(m);
        const my = earth.y + 0.085 * S * Math.sin(m);
        parts.push(glide(pic("moon", mx, my, 22), "moon"));
        // 月は小さいので、押せる範囲は44pxに広げる。
        parts.push(glide(disc(mx, my, 44), "moon-hit").cursor_pointer().on_click(() => setShared("solar.view", { kind: "moon" })));
        return root.children(parts);
    }
    detail() {
        const shown = this.shown();
        // レイアウトの props に view（スペースのid、または sun）があれば、その画面に固定する。見た目の確認用。
        const pinned = props()?.view;
        const fixed = pinned === SUN_NAME ? { kind: "sun" } : pinned === "moon" ? { kind: "moon" } : { kind: "project", space: pinned };
        const panel = (pinned ? fixed : shared("solar.view") ?? { kind: "home" });
        const space = panel.kind === "project" ? shown.find((s) => s.id === panel.space) : undefined;
        // 別の画面に移ったら、「閉じる」の1回目は取り消す。
        if (this.arming !== space?.id)
            this.arming = null;
        const column = v_flex().size_full().bg(BG).p(22).gap(14).text_color(TEXT);
        // 待っているProjectを出しているあいだは、列そのものを黄色で囲む。
        const framed = space?.status === "blocked" ? column.border(2).border_color(BLOCKED) : column.border_l(1).border_color(LINE);
        if (panel.kind === "sun")
            return framed.children(this.request(shown));
        if (panel.kind === "moon")
            return framed.children(this.settings());
        return framed.children(space ? this.project(space) : this.home(shown));
    }
    home(shown) {
        const hint = div().text_size(14).text_color(TEXT_DIM).child("太陽を押すと、仕事を頼めます");
        const caller = shown.find((s) => s.status === "blocked") ?? shown.find((s) => s.status === "done");
        if (!caller) {
            return [
                div().text_size(26).font_bold().child("いまは静かです"),
                div().text_size(14).text_color(TEXT_DIM).child("AIが呼ぶまで、何も覚えていなくていい"),
                hint,
            ];
        }
        const waiting = caller.status === "blocked";
        return [
            div().text_size(13).font_bold().text_color(waiting ? BLOCKED : DONE).child("あなたを呼んでいる惑星"),
            div().text_size(28).font_bold().truncate().child(`${caller.name}（${WORDS[caller.status ?? ""]}）`),
            button("open-caller", "その惑星を開く", waiting ? BLOCKED : DONE, waiting ? ON_BLOCKED : ON_DONE, 64, () => setShared("solar.view", { kind: "project", space: caller.id })),
            hint,
        ];
    }
    // 月を押したときの列。設定。
    settings() {
        const limit = this.limit();
        const still = Boolean(this.setting("still"));
        const heading = (text) => div().pt(8).text_size(13).text_color(TEXT_DIM).child(text);
        const chip = (id, text, on, enabled, action) => h_flex().id(id).flex_none().h(44).min_w(44).px(16).rounded(22).items_center().justify_center()
            .bg(on ? TEXT : CROSS).text_color(on ? BG : enabled ? TEXT : TEXT_FAINT).text_size(16).font_bold()
            .cursor_pointer().child(text).on_click(() => { if (enabled)
            action(); });
        return [
            div().text_size(12).font_family(MONO).text_color(TEXT_FAINT).child("月（設定）"),
            div().text_size(26).font_bold().child("設定"),
            heading("並列の上限"),
            h_flex().gap(14).items_center()
                .child(chip("limit-down", "−", false, limit > 1, () => setShared("solar.limit", limit - 1)))
                .child(div().w(28).text_center().text_size(26).font_bold().font_family(MONO).child(String(limit)))
                .child(chip("limit-up", "＋", false, limit < SLOTS, () => setShared("solar.limit", limit + 1))),
            heading("動き"),
            h_flex().gap(10)
                .child(chip("move-on", "オン", !still, true, () => setShared("solar.still", false)))
                .child(chip("move-off", "オフ", still, true, () => setShared("solar.still", true))),
            heading("通知"),
            div().text_size(14).child("Herdrのまま（あとで決める）"),
            div().pt(8).child(button("home", "ホームに戻る", CROSS, TEXT_DIM, 44, () => setShared("solar.view", { kind: "home" }))),
        ];
    }
    // 太陽を押したときの列。太陽に頼む文を書いて渡す。
    request(shown) {
        const back = (text) => button("home", text, CROSS, TEXT_DIM, 44, () => setShared("solar.view", { kind: "home" }));
        const label = div().text_size(12).font_family(MONO).text_color(TEXT_FAINT).child("太陽（Claude Code）");
        const title = (text) => div().text_size(26).font_bold().child(text);
        const note = (text) => div().text_size(14).text_color(TEXT_DIM).child(text);
        const sun = this.sun();
        if (!sun.space) {
            return [label, title("太陽がまだいません"), note("起こすと、Claude Code（Fable）が依頼を待ちます"),
                button("wake", "太陽を起こす", TEXT, BG, 56, () => this.wake()), back("やめる")];
        }
        const agent = sun.agent;
        if (!agent) {
            return [label, title("太陽が止まっています"), note("sun のスペースで claude を起動し直してください"), back("ホームに戻る")];
        }
        if (agent.status === "blocked") {
            // 質問には文章で答えられないので、ターミナルを開いて本人が答える。
            return [label, title("太陽が質問しています"), note("ターミナルを開いて、答えてください"),
                button("peek-sun", "ターミナルを開く", SUN_ASKS, BG, 56, () => { if (!this.demo())
                    run("terminal.peek", { terminal: agent.address }); }),
                back("ホームに戻る")];
        }
        if (this.full()) {
            return [label, title("軌道がいっぱいです"), note("Projectを1つ閉じるか、並列の数を増やすと頼めます"), back("ホームに戻る")];
        }
        const draft = this.draft;
        const ready = this.text.trim().length > 0;
        return [
            label, title("何を頼みますか"),
            ...(draft ? [Textarea.new(draft).flex_none().h(150).p(10).rounded(10).border(1).border_color(LINE).bg(CROSS).text_size(14).text_color(TEXT)] : []),
            note("Claude Code（Fable）が受け取ります。ローカルにフォルダを作り、空いている軌道に出します"),
            button("hand", "渡す", ready ? TEXT : CROSS, ready ? BG : TEXT_FAINT, 56, () => {
                if (!ready)
                    return;
                const text = this.text.trim();
                this.draft?.set_value("");
                this.text = "";
                setShared("solar.view", { kind: "home" });
                if (this.demo())
                    return;
                hc(["send", agent.address, text])
                    .then((r) => notify(r.code === 0
                    ? { title: "太陽に渡しました", level: "success" }
                    : { title: "太陽に渡せませんでした", body: r.stderr.trim().slice(0, 80), level: "error" }))
                    .catch((e) => notify({ title: "太陽に渡せませんでした", body: String(e).slice(0, 80), level: "error" }));
            }),
            back("やめる"),
        ];
    }
    // 太陽を起こす。sun という名前のスペースを作り、Claude Code（Fable）を役目の文書つきで起動する。
    wake() {
        if (this.demo())
            return;
        const folder = `${home()}/${PROJECTS}`;
        exec("mkdir", ["-p", folder])
            .then(() => run("space.new", {
            name: SUN_NAME,
            folder,
            argv: ["claude", "--model", "fable", "--append-system-prompt-file", `${appHome()}/${ART}/SUN.md`, "--allowedTools", ...SUN_TOOLS],
        }))
            .catch((e) => notify({ title: "太陽を起こせませんでした", body: String(e).slice(0, 80), level: "error" }));
    }
    project(space) {
        const crew = [...(this.crews().get(space.id) ?? [])].sort((a, b) => URGENCY[a.status ?? "unknown"] - URGENCY[b.status ?? "unknown"]);
        // 最初は、いちばん急ぎのAgentを選んでおく。
        const chosen = crew.find((a) => a.address === this.picked[space.id]) ?? crew[0];
        const tone = space.status === "blocked" ? BLOCKED : space.status === "done" ? DONE : TEXT_FAINT;
        const state = space.status ? `${WORDS[space.status]}・Agent ${crew.length}体` : "Agentなし";
        const parts = [
            div().text_size(12).font_family(MONO).text_color(tone).child(state),
            div().text_size(26).font_bold().font_family(MONO).truncate().child(space.name),
        ];
        for (const agent of crew) {
            const provider = PROVIDERS[agent.app ?? ""] ?? PROVIDER_OTHER;
            const row = h_flex().id(`agent-${agent.address}`).gap(8).px(8).py(6).rounded(8).items_center().text_size(13)
                .child(satellite(div().flex_none().size(10).rounded_full(), agent))
                .child(div().flex_1().min_w(0).truncate().font_family(MONO).child(agent.name))
                .child(div().flex_none().text_color(TEXT_DIM).child(provider.name));
            if (crew.length === 1) {
                parts.push(row);
                continue;
            }
            // 2体以上のときだけ、行で選べる。状態も行に出す。
            parts.push(row
                .child(div().flex_none().text_color(TEXT_FAINT).child(WORDS[agent.status ?? "unknown"]))
                .bg(agent === chosen ? CROSS : BG).cursor_pointer()
                .on_click((_event, cx) => { this.picked[space.id] = agent.address; cx.notify(); }));
        }
        if (chosen) {
            // blocked は承認や質問の画面が出ている状態で、文章を送っても答えにならない。
            // だから列からは答えさせず、ターミナルを開いて本人がその画面で答える。
            const waiting = chosen.status === "blocked";
            parts.push(button("peek", "ターミナルを開く", waiting ? BLOCKED : TEXT, waiting ? ON_BLOCKED : BG, 56, () => {
                if (!this.demo())
                    run("terminal.peek", { terminal: chosen.address });
            }));
        }
        parts.push(button("home", "ホームに戻る", CROSS, TEXT_DIM, 44, () => setShared("solar.view", { kind: "home" })));
        // 「閉じる」は列のいちばん下に離して置く。押し間違いを防ぐため。
        parts.push(div().flex_1());
        // 閉じるとAgentが終了し、元に戻せない。1回目は文言を変えるだけで、2回目で閉じる。
        const armed = this.arming === space.id;
        parts.push(button("close", armed ? "本当に閉じる（元に戻せません）" : "このProjectを閉じる", armed ? DANGER : CROSS, armed ? ON_DANGER : TEXT_DIM, 44, (cx) => {
            if (!armed) {
                this.arming = space.id;
                cx.notify();
                return;
            }
            this.arming = null;
            if (this.demo())
                return;
            const closing = (shared("solar.closing") ?? {});
            setShared("solar.closing", { ...closing, [space.id]: Date.now() });
            setShared("solar.view", { kind: "home" });
            run("space.close", { id: space.id, confirmed: true });
        }));
        return parts;
    }
    bar() {
        const shown = this.shown();
        const count = (status) => shown.filter((s) => s.status === status).length;
        const item = (label, value, tone, mark) => {
            const row = h_flex().gap(6).items_center();
            return (mark ? row.child(mark) : row)
                .child(div().text_color(TEXT_DIM).child(label))
                .child(div().font_bold().font_family(MONO).text_color(tone).child(value));
        };
        const mark = () => div().flex_none().size(8);
        return h_flex().size_full().bg(BG).border_t(1).border_color(LINE).px(16).gap(18).items_center().text_size(12)
            // 数が上限を超えているあいだは、黄色で知らせる。
            .child(item("並列", `${shown.length} / ${this.limit()}`, shown.length > this.limit() ? BLOCKED : TEXT))
            .child(item("待ってる", String(count("blocked")), BLOCKED, mark().rounded(2).bg(BLOCKED)))
            .child(item("進めた", String(count("done")), DONE, mark().rounded(2).bg(DONE)))
            .child(item("作業中", String(count("working")), TEXT, mark().rounded_full().border(1).border_color(TEXT_DIM)))
            .child(div().flex_1())
            .child(item("閉じたProject", String(Number(shared("solar.closed") ?? 0)), TEXT));
    }
}
function disc(x, y, size) {
    return div().absolute().left(x - size / 2).top(y - size / 2).size(size).rounded_full();
}
function pic(name, x, y, size) {
    return image(`${ART}/${name}.svg`).absolute().left(x - size / 2).top(y - size / 2).size(size);
}
// transitionは、どの要素の続きかをidで見分ける。動かす要素には必ず安定したidを付ける。
function glide(el, id) {
    return el.id(id).transition("left", GLIDE).transition("top", GLIDE);
}
function button(id, text, bg, fg, height, action) {
    return h_flex().id(id).flex_none().h(height).rounded(height / 2).bg(bg).text_color(fg)
        .items_center().justify_center().text_size(16).font_bold().cursor_pointer()
        .child(text).on_click((_event, cx) => action(cx));
}
function planet(parts, space, slot, crew, p, d, above, still) {
    const status = space.status;
    // Agentがいないスペース（statusがnull）は、印なしでidleと同じ暗さにしている。
    const dim = status === "idle" || status === "unknown" || status == null;
    const key = `planet-${space.id}`;
    if (crew.length > 0) {
        parts.push(glide(disc(p.x, p.y, 1.5 * d).border(1).border_color(ORBIT).border_dashed(), `${key}-moons`));
    }
    if (status === "working") {
        parts.push(glide(pic("ring-track", p.x, p.y, d), `${key}-track`));
        // 動きがオフのあいだは、弧を回さずその場に残す。
        const arc = svg(`${ART}/ring-arc.svg`).absolute().left(p.x - d / 2).top(p.y - d / 2).size(d).text_color(ARC);
        parts.push(glide(still ? arc : arc.spin(8000), `${key}-arc`));
    }
    if (status === "blocked")
        parts.push(glide(pic("ring-blocked", p.x, p.y, d), `${key}-blocked`));
    if (status === "done")
        parts.push(glide(pic("ring-done", p.x, p.y, d), `${key}-done`));
    const body = glide(pic(PLANETS[slot - 1], p.x, p.y, d), `${key}-body`);
    parts.push(dim ? body.opacity(DIM) : body);
    const badge = 0.38 * d;
    if (status === "blocked" || status === "done" || status === "idle") {
        parts.push(glide(pic(`badge-${status}`, p.x + 0.4 * d, p.y - 0.4 * d, badge), `${key}-badge`));
    }
    if (status === "unknown") {
        // 「？」の絵はないので、idleの印と同じ形を箱で作る。
        parts.push(glide(h_flex().absolute().left(p.x + 0.4 * d - 0.4 * badge).top(p.y - 0.4 * d - 0.4 * badge).size(0.8 * badge)
            .rounded(0.28 * badge).bg(BADGE).items_center().justify_center()
            .text_size(0.55 * badge).font_bold().text_color(TEXT).child("?"), `${key}-badge`));
    }
    const size = Math.max(10, 0.22 * d);
    for (let i = 0; i < crew.length; i++) {
        const a = rad(SATELLITE_START + (360 / crew.length) * i);
        parts.push(glide(satellite(disc(p.x + 0.75 * d * Math.cos(a), p.y + 0.75 * d * Math.sin(a), size), crew[i]), `${key}-agent-${i}`));
    }
    // 上用と下用の名前を両方動かしておき、見せるほうだけ不透明にする。
    // 1つの名前を上下に移すと、切り替えが4秒かけて滑ってしまうため。
    const tone = status === "blocked" ? BLOCKED_NAME : dim ? TEXT_DIM : TEXT;
    const name = (top, visible, id) => glide(div().absolute().left(p.x - NAME_WIDTH / 2).top(top).w(NAME_WIDTH)
        .text_center().truncate().text_size(14).font_bold().font_family(MONO)
        .text_color(tone).opacity(visible ? 1 : 0).child(space.name), id);
    parts.push(name(p.y - 0.75 * d - 6 - NAME_HEIGHT, above, `${key}-name-up`));
    parts.push(name(p.y + 0.75 * d + 6, !above, `${key}-name-down`));
    // 絵（image）は押しても反応しないので、押す範囲は透明な箱で上に重ねる。
    parts.push(glide(disc(p.x, p.y, d), `${key}-hit`).cursor_pointer()
        .on_click(() => setShared("solar.view", { kind: "project", space: space.id })));
}
function satellite(dot, agent) {
    const color = (PROVIDERS[agent.app ?? ""] ?? PROVIDER_OTHER).color;
    if (agent.status === "idle" || agent.status === "unknown")
        return dot.bg(BG).border(2).border_color(color);
    if (agent.status === "blocked")
        return dot.bg(color).border(2).border_color(BLOCKED);
    if (agent.status === "done")
        return dot.bg(color).border(2).border_color(DONE);
    return dot.bg(color);
}
