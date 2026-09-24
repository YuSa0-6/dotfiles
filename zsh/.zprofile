
eval "$(/opt/homebrew/bin/brew shellenv)"

# Setting PATH for Python 3.12
# The original version is saved in .zprofile.pysave
export PATH

# マシン固有の設定（リポジトリ管理外）
[[ -r ~/.zprofile.local ]] && source ~/.zprofile.local
