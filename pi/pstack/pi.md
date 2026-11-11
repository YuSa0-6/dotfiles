# pstack in Pi

pstack skills use Cursor names. In Pi, read this file once per session, then map each Cursor name in a skill with the tables below. `<pstack>` means the folder that holds `skills/` and `docs/` (`~/.pi/agent/pstack`). If a Cursor field has no row, drop it and say so. Never pass a field or value the tool schema rejects.

## Tools

| Cursor | Pi |
| --- | --- |
| `Task` | The `workflow` tool (`pi-dynamic-workflows`). One `agent(prompt, { label })` call per delegate, `parallel([...])` for a fan-out. When the session has no `workflow` tool, do the delegate's work yourself, in order, and say so. |
| `AskQuestion` | Ask in plain text: one message, 2 to 4 options, the recommended one first. |
| Open a todolist | Keep the list in your reply and update it at each phase. |
| Run another pstack skill (`/name` or "the **name** skill") | `read` `<pstack>/skills/<name>/SKILL.md` and follow it. When you tell the user to type it, write `/skill:<name>`. |
| `Grep`, `Glob` | `bash` with `rg`. |
| `Read`, `Write`, `StrReplace`, `Shell` | `read`, `write`, `edit`, `bash`. |

## Subagent fields

A workflow `agent()` takes a prompt and a label. It starts a fresh Pi session with the standard coding tools and no memory of this one, so every other Cursor field goes into the prompt as prose.

| Cursor | Pi |
| --- | --- |
| `subagent_type: generalPurpose` | A plain `agent()` call. |
| `poteto-agent`, `comment-sicko` | A plain `agent()` call whose prompt starts with "Read `<pstack>/agents/<name>.md` in full and act as it describes." Give the absolute path. |
| `readonly: true` | The prompt says "do not edit files", and you check `git status` afterward. |
| `readonly: false` | Omit. |
| `environment: "cloud"` | The prompt tells the worker to make a git worktree for the branch or commit you name, and to work there. |
| `environment: "local"` | Omit. |
| `cloud_base_branch: <b>` | Tell the worker to check out `<b>` first. |
| `run_in_background: true` | Omit. The `workflow` call returns when its agents finish. |
| `resume` | Spawn a new agent and paste the earlier result into its prompt. |
| `file_attachments` | List the absolute paths in the prompt. |

## Models

| Cursor | Pi |
| --- | --- |
| Any model slug on a subagent (`claude-*`, `grok-*`, `gpt-*`) | Omit. A workflow agent runs on the session model. Say so once. |
| `auto` or `inherit-parent` | Omit. |
| The `pstack-models.mdc` rule, `~/.cursor/rules/pstack-models.mdc` | Not used in Pi. Every role runs on the session model. |

## setup-pstack

Skip it in Pi. There is no per-role model to choose.

## Paths

| Cursor | Pi |
| --- | --- |
| `.cursor/skills/`, `~/.cursor/skills/` | `.pi/skills/`, `~/.pi/agent/skills/` |
| `~/.cursor/plugins/` | `~/.pi/agent/pstack/` for pstack itself. Pi has no plugin folder. |
| `.cursor/rules/*.mdc`, always-applied rules | `AGENTS.md`. Pi never reads `.mdc` files. |
| `https://github.com/cursor/plugins/blob/main/pstack/<path>` | `<pstack>/<path>` when that file exists. Read the local copy and never fetch it. Give the user the URL when they need a link. |
| Transcripts in `~/.cursor/projects/<slug>/agent-transcripts/` | `~/.pi/agent/sessions/<slug>/`. The slug is the workspace path with each `/` changed to `-`, wrapped in `--`, so `/Users/you/proj` is `--Users-you-proj--`. Read only this workspace's folder. |

## Cursor-only features

Pi has no Cursor Automations, Bugbot, Cursor cloud agents, or built-in PR tool. When a step needs one, put one line in your reply, `Skipped in Pi: <step>. <reason>.`, then go on to the next step. Do not stop, ask, or retry. When a later step needs what the skipped step made, such as a URL or a key, leave a placeholder and name it in the line.

| Cursor | Pi |
| --- | --- |
| Cursor Automations: routines, `update_state` routine calls, webhooks, routine wakes, and `SendToUser` secret requests | Skip with the line. |
| Bugbot | Bugbot comments on a GitHub PR are ordinary review threads, so triage them with the forge command that the step gives. Skip a step that starts, waits for, or configures Bugbot when the PR has no Bugbot check or comment. |
| Cursor cloud agents | `environment: "cloud"` maps to a worktree, as in Subagent fields. Skip a step that needs the cloud agent itself. |
| A built-in PR tool | Use the forge command that the step gives, such as `gh pr create`. That is not a skip, so write no line. |
