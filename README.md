# dotfiles

[mise](https://mise.jdx.dev/)で管理する設定ファイルです。

管理対象：

- Claude Codeの設定・テーマ
- ompの設定（piの設定は移行確認まで保持）
- Herdrの設定
- Rex（`init.lua`）
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

## Rex

`rex/init.lua`を`~/.config/rex/init.lua`へ配置します。キーバインド・キーモード・カスタムアクションのみを管理し、フォント・テーマなどの見た目はRexのSettings画面で設定します。`rex config check`で読み込みを確認できます。

## ompへの移行

`omp/agent/config.yml`でモデルを役割別に割り当て、`task.agentModelOverrides`で各サブエージェントを役割に固定しています。メイン・Plan・designerはClaude Opus 5.5、AdvisorはClaude Fable 5.1、サブエージェントはCodex（`task`/`librarian`はGPT-6 Sol、`reviewer`/`security-reviewer`は`slow`役のGPT-6 Astra、`scout`/`sonic`は`smol`役のGPT-6 Luna）です。選定はOpenRouter MCPの`list-benchmarks`（Artificial Analysis / Design Arena）に基づきます。`openai/`・`openrouter/`は従量課金のため、役割・フォールバックには使いません。Skillは既存の`~/.agents/skills`を共用します。piの`context-mode`はpi用パッケージのため、ompへは移していません（ompには組み込みのサブエージェント・LSPがあります）。

`mise bootstrap`後、`omp`の`/login`でAnthropicとOpenAI Codexに認証し、`omp config get modelRoles`と`/agents`で確認してください。ompの`/model`・`/settings`で設定を保存するとsymlinkが通常ファイルに置き換わることがあるため、その場合は差分をこのファイルへ戻して`mise bootstrap`し直してください。piの認証情報・セッションは移行しません。
