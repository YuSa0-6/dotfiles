#!/usr/bin/env bash
# Claude Code Starship-style statusline

# Read JSON from stdin
input=$(cat)

# Parse fields using basic string manipulation / grep
model=$(echo "$input" | grep -o '"display_name":"[^"]*"' | head -1 | cut -d'"' -f4)
used_pct=$(echo "$input" | grep -o '"used_percentage":[0-9.]*' | head -1 | grep -o '[0-9.]*$')
total_cost=$(echo "$input" | grep -o '"total_cost_usd":[0-9.]*' | head -1 | grep -o '[0-9.]*$')

# Shorten model name
if [[ -n "$model" ]]; then
  short_model=$(echo "$model" | sed 's/claude-//' | sed 's/-[0-9]*\.[0-9]*//' | sed 's/sonnet/snnt/' | sed 's/opus/opus/' | sed 's/haiku/hiku/')
  display_model="$model"
else
  display_model="unknown"
fi

# Round percentage
if [[ -n "$used_pct" ]]; then
  pct_int=$(printf "%.0f" "$used_pct" 2>/dev/null || echo "0")
else
  pct_int=0
fi

# Context bar (10 chars total)
build_bar() {
  local pct=$1
  local filled=$(( pct * 10 / 100 ))
  local empty=$(( 10 - filled ))
  local bar=""
  for ((i=0; i<filled; i++)); do bar="${bar}▓"; done
  for ((i=0; i<empty; i++)); do bar="${bar}▒"; done
  echo "$bar"
}

bar=$(build_bar "$pct_int")

# Git branch
git_branch=""
if git rev-parse --is-inside-work-tree &>/dev/null 2>&1; then
  branch=$(git symbolic-ref --short HEAD 2>/dev/null || git rev-parse --short HEAD 2>/dev/null)
  if [[ -n "$branch" ]]; then
    git_branch=" $branch"
  fi
fi

# Cost formatting
if [[ -n "$total_cost" && "$total_cost" != "0" ]]; then
  cost_display=$(printf "\$%.4f" "$total_cost" 2>/dev/null || echo "\$0.0000")
else
  cost_display="\$0.0000"
fi

# ANSI colors
RESET="\033[0m"
BOLD="\033[1m"

# Segment colors
BG_BLUE="\033[44m";    FG_BLUE="\033[34m"
BG_GREEN="\033[42m";   FG_GREEN="\033[32m"
BG_YELLOW="\033[43m";  FG_YELLOW="\033[33m"
BG_RED="\033[41m";     FG_RED="\033[31m"
BG_PURPLE="\033[45m";  FG_PURPLE="\033[35m"
BG_DARK="\033[100m";   FG_DARK="\033[90m"
FG_WHITE="\033[97m"
FG_BLACK="\033[30m"

# Pick context color based on usage
if (( pct_int < 50 )); then
  CTX_BG=$BG_GREEN;  CTX_FG=$FG_GREEN
elif (( pct_int < 80 )); then
  CTX_BG=$BG_YELLOW; CTX_FG=$FG_YELLOW
else
  CTX_BG=$BG_RED;    CTX_FG=$FG_RED
fi

# Powerline separator characters
SEP_RIGHT="" # U+E0B0
SEP_THIN=""  # U+E0B1

# Build output
output=""

# Segment 1: Model (blue)
output+="${BG_BLUE}${FG_WHITE}${BOLD} ≡ ${display_model} ${RESET}"
output+="${CTX_FG}${SEP_RIGHT}${RESET}"

# Segment 2: Context bar (green/yellow/red)
output+="${CTX_BG}${FG_WHITE}${BOLD} ${bar} ${pct_int}% ${RESET}"

# Segment 3: Git branch (purple, only if in git repo)
if [[ -n "$git_branch" ]]; then
  output+="${FG_PURPLE}${SEP_RIGHT}${RESET}"
  output+="${BG_PURPLE}${FG_WHITE}${BOLD}${git_branch} ${RESET}"
  output+="${FG_DARK}${SEP_RIGHT}${RESET}"
else
  output+="${FG_DARK}${SEP_RIGHT}${RESET}"
fi

# Segment 4: Cost (dark green)
output+="${BG_DARK}${FG_WHITE}${BOLD} ${cost_display} ${RESET}"
output+="${FG_DARK}${SEP_RIGHT}${RESET}"

printf "%b" "$output"
