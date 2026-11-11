# dotfiles

[mise](https://mise.jdx.dev/)で管理する設定ファイルです。

管理対象：

- Claude Codeの設定・コマンド・テーマ・hook（fallow gate。`fallow`本体は`mise use -g npm:fallow`で別途導入）
- ompの設定、team-review Skill・観点別エージェント、PR作成前hook（piの設定は移行確認まで保持）
- Herdrの設定とSkill
- Zsh
- Ghostty
- Neovim
- druk（`config.json`のみ。拡張・セッションは除外）

## miseでセットアップ

[mise](https://mise.jdx.dev/getting-started.html)をインストールし、GitHubからセットアップ内容を確認します。

```sh
mise bootstrap --from https://github.com/YuSa0-6/dotfiles.git --dry-run
```

確認後、設定を取得して適用します。

```sh
mise bootstrap --from https://github.com/YuSa0-6/dotfiles.git
```

取得済みのリポジトリでは、次のコマンドで確認・適用できます。

```sh
mise bootstrap --dry-run
mise bootstrap
mise bootstrap status
```

認証情報、セッション、履歴、キャッシュ、ローカル権限、生成ファイルは意図的に管理対象から除外しています。

マシン固有・社内向けのシェル設定は、管理対象外の`~/.zshrc.local`と`~/.zprofile.local`に置きます（`.zshrc`・`.zprofile`の末尾で読み込みます）。

## Herdr Skill

`herdr/skill/SKILL.md`を、miseで次のパスへ配置します。

- omp / Pi：`~/.agents/skills/herdr/SKILL.md`（両方が自動検出するため、専用ディレクトリには重複して配置しません）
- Claude Code：`~/.claude/skills/herdr/SKILL.md`

omp / Piでは`/skill:herdr`、Claude Codeでは`/herdr`で利用できます。Herdrを操作するには、Herdr内で実行している必要があります（`HERDR_ENV=1`）。この設定で導入するのはSkillのみで、Herdr本体やagent-state hookは含みません。

## ompへの移行

`omp/agent/config.yml`でモデルを役割別に割り当て、`task.agentModelOverrides`で各サブエージェントを役割に固定しています。メインとPlanはClaude Fable 5.2（thinking `high`）です。作業を担う`task`役と精査を担う`slow`役はClaude Opus 5.5（thinking `high`）で、`task`・pstackの`poteto-agent`が`task`役、`reviewer`・`security-reviewer`・pstackの`thermo-nuclear-review-subagent`・`thermo-nuclear-code-quality-review-subagent`・`comment-sicko`が`slow`役を使います。pstackのエージェントはモデル指定を持たず、割り当てがなければ親のFable 5.2で動くため、役割へ固定しています。画像への質問（`read`の画像クエリ）を担う`vision`役はGPT-6.1 Terraへ委譲し、`scout`/`sonic`（`smol`役）とcommit・tiny・memoryはClaude Haiku 5.5で軽く回します。computer-useのスクリーンショットは実行中セッションのモデルへ返るため、`vision`役の対象外です。AdvisorはGPT-6 Astra（thinking `medium`）、`task`のagentAdvisorはGPT-6.1 Solです。フォールバックにはCodex（`default`/`task`はGPT-6.1 Sol、`slow`はGPT-6 Astra、`smol`はGPT-6 Luna）を置いています。モデルはAnthropic（`anthropic/`）とOpenAI Codex（`openai-codex/`）の2系統だけを使い、従量課金の`openai/`・`openrouter/`と、AWS認証情報があると自動で有効になるAmazon Bedrock（`amazon-bedrock`・`bedrock-mantle`）は`disabledProviders`で外しています。Skillは既存の`~/.agents/skills`を共用します。piの`pi-dynamic-workflows`・`context-mode`・`pi-lens`・`ponytail`はpi用パッケージのため、ompへは移していません（ompには組み込みのサブエージェント・LSPがあります）。

`omp/agent/APPEND_SYSTEM.md`はClaude Codeのoutput style「Readable」（`~/.claude/output-styles/readable.md`）と同じ文体指示です。ompはoutput styleを読まないため、既定のシステムプロンプトを残したまま末尾に追記する`APPEND_SYSTEM.md`へ置いています。

`mise bootstrap`後、`omp`の`/login`でAnthropicとOpenAI Codexに認証し、`omp config get modelRoles`と`/agents`で確認してください。ompの`/model`・`/settings`で設定を保存するとsymlinkが通常ファイルに置き換わることがあるため、その場合は差分をこのファイルへ戻して`mise bootstrap`し直してください。piの認証情報・セッションは移行しません。

## ompのPR作成前レビュー

`omp/agent/skills/team-review/SKILL.md`を`~/.omp/agent/skills/team-review/`へ、6つの観点別エージェントを`~/.omp/agent/agents/`へリンクします。Standards・Spec・簡潔さは`@slow`、定義順・命名・記述の役割分担は`@task`で、どちらもClaude Opus 5.5です。セキュリティは組み込みの`security-reviewer`（`@slow`）が、security-auditをPR差分に限定したguidance modeで参照します。Claude・Codexの既存の`team-review`は残り、ompではネイティブSkillが優先されます。

`omp/agent/hooks/pre/pr-gate.ts`は`~/.omp/agent/hooks/pre/`へリンクします。ユーザー全体のhookなので、dotfilesを含む**このリポジトリ以外でも**`gh pr create`またはompの`github`ツールによるPR作成を止めます。HEADごとの`git rev-parse --git-path omp-review`以下に`verdict: pass`のレビュー記録が必要です。lockfile・`drizzle/meta/**`を除く差分が300行を超えた場合は、作成を止めずに分割を促す警告を返します。commit-msg hookやteam-reviewを迂回する環境変数は設けません。

security-auditはdotfilesではなくグローバルの`~/.agents/skills/security-audit/`に導入し、`~/.claude/skills/security-audit`からも同じ実体を参照します。取り込んだCloudflareのコミットは`c1c8a8c1471069fb0e188eeaff69b8e8db6564a8`（2026-09-14T19:28:54Z、導入時点で公開から3日以上経過）。再導入時はその時点のコミット日時が3日以上前か確認します。

## pstack

[cursor/plugins](https://github.com/cursor/plugins/tree/main/pstack)のpstack（Lauren Tan作、MIT）を、公式READMEの手順どおりClaude Codeのプラグインとして入れます。marketplace登録と有効化は`claude/settings.json`（`extraKnownMarketplaces.cursor-plugins`・`enabledPlugins`）に入っています。

```sh
claude plugin marketplace add cursor/plugins
claude plugin install pstack@cursor-plugins
```

`marketplace add`はコミットを指定できないため、初回はその時点の最新が入ります（3日ルールの例外）。導入時は`6b0300214a09fd6029cfb7077043125758cd1fd2`（2026-11-07T04:41:10Z、pstack 0.15.36）。サードパーティmarketplaceは自動更新しないため、以後の`claude plugin marketplace update cursor-plugins`・`claude plugin update pstack@cursor-plugins`は最新コミットが3日以上前か確認してから実行します。

Claude Codeでは`/pstack:poteto-mode`などプラグインの名前空間付きで全スキルを使えます。初回は`/pstack:setup-pstack`でロールごとのモデルを選び、`~/.claude/rules/pstack-models.md`に保存します。

ompには、pstackをClaude Code・Codex・ompなど複数のハーネス向けに移植した[michael-denyer/pstack-claude](https://github.com/michael-denyer/pstack-claude)（MIT）を、ompのプラグインとして入れます。スキル本文がハーネス別の対応表（`skills/poteto-mode/references/omp-tools.md`）を持つため、omp側の`skills`設定は使いません。

```sh
omp plugin marketplace add michael-denyer/pstack-claude
omp plugin install --scope user pstack@pstack-claude
```

導入の記録は`~/.omp/plugins/`に入り、dotfilesの管理外です。新しい環境では上の2行を実行し、ompを起動し直します。こちらもコミットを指定できないため、初回は3日ルールの例外です。導入時は`bc09365fe61c725c486ba95157fc4048bf8a0b99`（2026-11-11T00:19:58Z、pstack 0.9.135）。以後の`omp plugin upgrade`は最新コミットが3日以上前か確認してから実行します。

Claude Code側の公式版（0.15.36）はルートに標準形式の`plugin.json`を持つため、ompの探索元`agent-plugins`（Agent Plugins仕様のパッケージからスキルとMCPを読む仕組み）が`~/.claude/plugins/`から拾います。frontmatterの検査を通る`setup-pstack`だけが読まれ、素の名前を取ってomp版を`pstack/setup-pstack`へ押しのけるので、`disabledProviders`に`agent-plugins`を入れて止めています。この探索元が読んでいたのはその1件だけです。Claude Code側の実体はそのまま残ります。

プラグインはompの拡張として、メインエージェントの各ターンに「複数ファイルの変更・設計判断・原因不明のバグでは`poteto-mode`を読む」という指示を足します。この自動の振り分けを止めるときは、`~/.omp/pstack-models.md`に`session hook: off`の1行を書いてompを起動し直します。ロールごとのモデルはompの`modelRoles`と`task.agentModelOverrides`で決めます（「ompへの移行」を参照）。
