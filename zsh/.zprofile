eval "$(/opt/homebrew/bin/brew shellenv)"

# mise shims for login shells that never read .zshrc (GUI apps, rex run, git pagers)
eval "$($HOME/.local/bin/mise activate zsh --shims)"
