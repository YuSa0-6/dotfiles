# dotfiles

[mise](https://mise.jdx.dev/)で管理する設定ファイルです。

管理対象：

- Claude Codeの設定・コマンド・テーマ
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

- Pi：`~/.agents/skills/herdr/SKILL.md`（自動検出されるため、`~/.pi/agent/skills`には重複して配置しません）
- Claude Code：`~/.claude/skills/herdr/SKILL.md`

Piでは`/skill:herdr`、Claude Codeでは`/herdr`で利用できます。Herdrを操作するには、Herdr内で実行している必要があります（`HERDR_ENV=1`）。この設定で導入するのはSkillのみで、Herdr本体やagent-state hookは含みません。
