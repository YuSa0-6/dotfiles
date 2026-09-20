# dotfiles

Configuration files managed with [mise](https://mise.jdx.dev/).

Managed areas:

- Claude Code settings, commands, and themes
- Herdr preferences and Skill
- Zsh
- Ghostty
- Neovim

## Setup with mise

Install [mise](https://mise.jdx.dev/getting-started.html), then preview the setup directly from GitHub:

```sh
mise bootstrap --from https://github.com/YuSa0-6/dotfiles.git --dry-run
```

Retrieve and apply it after reviewing the preview:

```sh
mise bootstrap --from https://github.com/YuSa0-6/dotfiles.git
```

From an existing checkout, inspect or apply changes with:

```sh
mise bootstrap --dry-run
mise bootstrap
mise bootstrap status
```

Authentication, sessions, history, caches, local permissions, and generated
files are intentionally excluded.

## Herdr Skill

`herdr/skill/SKILL.md` is shared through these mise-managed paths:

- Pi: `~/.agents/skills/herdr/SKILL.md` (auto-discovered; no second copy under `~/.pi/agent/skills`)
- Claude Code: `~/.claude/skills/herdr/SKILL.md`

Use `/skill:herdr` in Pi or `/herdr` in Claude Code. Herdr control requires
running inside Herdr (`HERDR_ENV=1`). This installs the Skill only, not the
Herdr binary or agent-state hooks.
