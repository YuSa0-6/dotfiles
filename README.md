# dotfiles

[mise](https://mise.jdx.dev/)で管理する設定ファイルです。

管理対象：

- Claude Codeの設定・コマンド・テーマ・hook（fallow gate。`fallow`本体は`mise use -g npm:fallow`で別途導入）
- ompの設定（piの設定は移行確認まで保持）
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
