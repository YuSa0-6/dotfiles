# dotfiles

Personal configuration managed with [mise](https://mise.jdx.dev/).

Managed areas:

- Claude Code settings and personal resources
- Herdr preferences and Skill
- Zsh
- Ghostty
- Neovim

Preview or apply the configuration from this repository:

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
