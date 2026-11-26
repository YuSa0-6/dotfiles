# dotfiles

[mise](https://mise.jdx.dev/)で管理する設定ファイルです。

管理対象：

- Claude Codeの設定・テーマ
- piの設定
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
