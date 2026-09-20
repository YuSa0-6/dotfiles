-- vim.pack でプラグイン管理（0.12 ネイティブ）
vim.pack.add({
  -- ユーティリティ群
  { src = "https://github.com/echasnovski/mini.nvim" },

  -- 構文解析
  { src = "https://github.com/nvim-treesitter/nvim-treesitter" },

  -- 補完（blink.cmp v2 は blink.lib 依存）
  { src = "https://github.com/saghen/blink.lib" },
  { src = "https://github.com/saghen/blink.cmp" },

  -- AI 補完
  { src = "https://github.com/zbirenbaum/copilot.lua" },

  -- LSP / DAP / リンタのインストーラ
  { src = "https://github.com/mason-org/mason.nvim" },

  -- LSP server config 定義集（lsp/<server>.lua を提供）
  { src = "https://github.com/neovim/nvim-lspconfig" },

  -- git 差分マーカ
  { src = "https://github.com/lewis6991/gitsigns.nvim" },

  -- LSP プログレス通知
  { src = "https://github.com/j-hui/fidget.nvim" },

  -- カラースキーム
  { src = "https://github.com/Shatur/neovim-ayu" },
})

-- ============================================================
-- mini.nvim
-- ============================================================
require("mini.icons").setup()
require("mini.pairs").setup()
require("mini.comment").setup()
require("mini.ai").setup()
require("mini.surround").setup()
require("mini.statusline").setup({ use_icons = true })
require("mini.pick").setup({
  window = { config = { border = "rounded" } },
})
require("mini.files").setup({
  windows = { preview = true, width_preview = 60 },
})
require("mini.extra").setup()
require("mini.notify").setup({
  lsp_progress = { enable = false }, -- fidget に任せる
})
vim.notify = require("mini.notify").make_notify()

-- ============================================================
-- カラースキーム
-- ============================================================
require("ayu").setup({
  mirage = true,
  overrides = {},
})
pcall(vim.cmd.colorscheme, "ayu-mirage")
vim.g.transparency_enabled = true
require("ui").apply_transparency()

-- ============================================================
-- treesitter (master API)
-- ============================================================
local ts = require("nvim-treesitter")
ts.install({
  "lua", "vim", "vimdoc", "query", "bash",
  "json", "yaml", "toml",
  "typescript", "tsx", "javascript",
  "html", "css", "scss",
  "python", "rust", "go",
  "markdown", "markdown_inline",
  "regex", "diff", "gitcommit",
}, { summary = true })

vim.api.nvim_create_autocmd("FileType", {
  group = vim.api.nvim_create_augroup("user_ts", { clear = true }),
  callback = function(ev)
    pcall(vim.treesitter.start, ev.buf)
    vim.bo[ev.buf].indentexpr = "v:lua.require'nvim-treesitter'.indentexpr()"
  end,
})

-- ============================================================
-- mason
-- ============================================================
require("mason").setup({ ui = { border = "rounded" } })

-- ============================================================
-- gitsigns / fidget
-- ============================================================
require("gitsigns").setup({
  signcolumn = true,
  numhl = false,
  current_line_blame = false,
})
require("fidget").setup({
  notification = { window = { winblend = 0 } },
})

-- ============================================================
-- copilot.lua
-- ============================================================
require("copilot").setup({
  suggestion = {
    enabled = true,
    auto_trigger = true,
    keymap = {
      accept = "<C-j>",
      accept_word = "<C-l>",
      accept_line = false,
      next = "<C-n>",
      prev = "<C-p>",
      dismiss = "<C-h>",
    },
  },
  panel = { enabled = false },
  filetypes = { ["*"] = true },
})

-- ============================================================
-- blink.cmp
-- ============================================================
require("blink.cmp").setup({
  keymap = { preset = "default" },
  appearance = { nerd_font_variant = "mono" },
  completion = {
    list = { selection = { preselect = true, auto_insert = false } },
    menu = {
      border = "rounded",
      draw = { treesitter = { "lsp" } },
    },
    documentation = {
      auto_show = true,
      auto_show_delay_ms = 150,
      window = { border = "rounded" },
    },
    ghost_text = { enabled = false }, -- copilot のゴーストと衝突するので OFF
  },
  signature = { enabled = true, window = { border = "rounded" } },
  fuzzy = { implementation = "lua" },
  sources = {
    default = { "lsp", "path", "snippets", "buffer" },
  },
})
