local o = vim.opt
local g = vim.g

g.mapleader = " "
g.maplocalleader = " "

-- 表示
o.number = true
o.relativenumber = true
o.signcolumn = "yes"
o.cursorline = true
o.scrolloff = 8
o.sidescrolloff = 8
o.termguicolors = true
o.background = "dark"
o.winborder = "rounded"
o.pumheight = 12
o.list = true
o.listchars = { tab = "▏ ", trail = "·", nbsp = "␣" }
o.fillchars = { eob = " ", fold = " " }

-- インデント
o.expandtab = true
o.shiftwidth = 2
o.tabstop = 2
o.softtabstop = 2
o.smartindent = true

-- 検索
o.ignorecase = true
o.smartcase = true
o.incsearch = true
o.inccommand = "split"

-- 分割
o.splitright = true
o.splitbelow = true

-- 0.12 補完: fuzzy + popup + auto menu
o.completeopt = { "menu", "menuone", "noinsert", "fuzzy", "popup" }

-- LSP foldexpr
o.foldmethod = "expr"
o.foldexpr = "v:lua.vim.lsp.foldexpr()"
o.foldtext = "v:lua.vim.lsp.foldtext()"
o.foldlevel = 99

-- ファイル
o.undofile = true
o.swapfile = false
o.updatetime = 250
o.timeoutlen = 400
o.confirm = true
o.clipboard = "unnamedplus"

-- メッセージ抑制
o.shortmess:append("WIcC")
