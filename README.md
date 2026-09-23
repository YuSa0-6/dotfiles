# dotfiles

[mise](https://mise.jdx.dev/)で管理する設定ファイルです。

管理対象：

- Claude Codeの設定・コマンド・テーマ
- ompの設定（piの設定は移行確認まで保持）
- Herdrの設定とSkill
- Zsh
- Ghostty
- Neovim

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

## Herdr Skill

`herdr/skill/SKILL.md`を、miseで次のパスへ配置します。

- omp / Pi：`~/.agents/skills/herdr/SKILL.md`（両方が自動検出するため、専用ディレクトリには重複して配置しません）
- Claude Code：`~/.claude/skills/herdr/SKILL.md`

omp / Piでは`/skill:herdr`、Claude Codeでは`/herdr`で利用できます。Herdrを操作するには、Herdr内で実行している必要があります（`HERDR_ENV=1`）。この設定で導入するのはSkillのみで、Herdr本体やagent-state hookは含みません。

## ompへの移行

`omp/agent/config.yml`でモデルを役割別に割り当て、`task.agentModelOverrides`で各サブエージェントを役割に固定しています。メイン・Plan・designerはClaude Opus 5.5、AdvisorはClaude Fable 5.1、サブエージェントはCodex（`task`/`librarian`はGPT-6 Sol、`reviewer`/`security-reviewer`は`slow`役のGPT-6 Astra、`scout`/`sonic`は`smol`役のGPT-6 Luna）です。選定はOpenRouter MCPの`list-benchmarks`（Artificial Analysis / Design Arena）に基づきます。`openai/`・`openrouter/`は従量課金のため、役割・フォールバックには使いません。Skillは既存の`~/.agents/skills`を共用します。piの`pi-dynamic-workflows`・`context-mode`・`pi-lens`・`ponytail`はpi用パッケージのため、ompへは移していません（ompには組み込みのサブエージェント・LSPがあります）。

`mise bootstrap`後、`omp`の`/login`でAnthropicとOpenAI Codexに認証し、`omp config get modelRoles`と`/agents`で確認してください。ompの`/model`・`/settings`で設定を保存するとsymlinkが通常ファイルに置き換わることがあるため、その場合は差分をこのファイルへ戻して`mise bootstrap`し直してください。piの認証情報・セッションは移行しません。
