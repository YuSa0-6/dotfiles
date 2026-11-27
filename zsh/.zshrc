# Oh My Zsh
export ZSH="$HOME/.oh-my-zsh"
ZSH_THEME="agnoster"
plugins=(git bundler rails ruby brew z)

# extra completions must be on fpath before oh-my-zsh runs compinit
fpath=(~/.grok/completions/zsh $fpath)
source $ZSH/oh-my-zsh.sh

# Rex
command -v rex >/dev/null && source <(rex completion zsh)

[[ "$TERM_PROGRAM" == "kiro" ]] && . "$(kiro --locate-shell-integration-path zsh)"

# ghq + fzf: Ctrl-G to jump to a ghq-managed repo
function ghq-fzf() {
  local dir
  dir=$(ghq list | fzf) && cd "$(ghq root)/$dir"
  zle reset-prompt
}
zle -N ghq-fzf
bindkey '^G' ghq-fzf

# Added by the Hunk installer (https://hunk.dev)
export PATH="$HOME/.hunk/bin:$PATH"

# >>> grok installer >>>
export PATH="$HOME/.grok/bin:$PATH"
# <<< grok installer <<<

# Antigravity CLI and mise live here
export PATH="$HOME/.local/bin:$PATH"

# mise: keep after other PATH edits so its tool paths come first
eval "$($HOME/.local/bin/mise activate zsh)"

# fzf comes from mise, so load it after mise is active
source <(fzf --zsh)
