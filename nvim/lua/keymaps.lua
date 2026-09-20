local map = vim.keymap.set

-- 検索ハイライト消去
map("n", "<Esc>", "<cmd>nohlsearch<cr>")

-- 保存・終了
map("n", "<leader>w", "<cmd>w<cr>", { desc = "Save" })
map("n", "<leader>q", "<cmd>q<cr>", { desc = "Quit" })
map("n", "<leader>Q", "<cmd>qa!<cr>", { desc = "Quit all (force)" })

-- 選択範囲を維持してインデント
map("v", "<", "<gv")
map("v", ">", ">gv")

-- ウィンドウ移動
map("n", "<C-h>", "<C-w>h")
map("n", "<C-j>", "<C-w>j")
map("n", "<C-k>", "<C-w>k")
map("n", "<C-l>", "<C-w>l")

-- バッファ
map("n", "<S-h>", "<cmd>bprevious<cr>", { desc = "Prev buffer" })
map("n", "<S-l>", "<cmd>bnext<cr>", { desc = "Next buffer" })
map("n", "<leader>bd", "<cmd>bdelete<cr>", { desc = "Delete buffer" })

-- スニペットジャンプ (vim.snippet, 0.10+)
map({ "i", "s" }, "<C-f>", function()
  if vim.snippet.active({ direction = 1 }) then
    return "<cmd>lua vim.snippet.jump(1)<cr>"
  end
  return "<C-f>"
end, { expr = true })
map({ "i", "s" }, "<C-b>", function()
  if vim.snippet.active({ direction = -1 }) then
    return "<cmd>lua vim.snippet.jump(-1)<cr>"
  end
  return "<C-b>"
end, { expr = true })

-- 透明化トグル
map("n", "<leader>tp", function()
  local ui = require("ui")
  if vim.g.transparency_enabled then
    pcall(vim.cmd.colorscheme, vim.g.colors_name)
    vim.g.transparency_enabled = false
  else
    ui.apply_transparency()
    vim.g.transparency_enabled = true
  end
end, { desc = "Toggle transparency" })

-- mini.pick / files
map("n", "<leader>ff", function() require("mini.pick").builtin.files() end, { desc = "Find files" })
map("n", "<leader>fg", function() require("mini.pick").builtin.grep_live() end, { desc = "Grep" })
map("n", "<leader>fb", function() require("mini.pick").builtin.buffers() end, { desc = "Buffers" })
map("n", "<leader>fh", function() require("mini.pick").builtin.help() end, { desc = "Help tags" })
map("n", "<leader>fd", function() require("mini.extra").pickers.diagnostic() end, { desc = "Diagnostics" })
map("n", "<leader>e", function() require("mini.files").open(vim.api.nvim_buf_get_name(0)) end, { desc = "File explorer" })
map("n", "<leader>E", function() require("mini.files").open(vim.uv.cwd()) end, { desc = "File explorer (cwd)" })

-- LSP の自前マップは最小（grn/gra/grr/gri/grt/gO/<C-s> は 0.12 デフォルト）
map("n", "<leader>cf", function() vim.lsp.buf.format({ async = true }) end, { desc = "Format" })
map("n", "<leader>ch", function()
  vim.lsp.inlay_hint.enable(not vim.lsp.inlay_hint.is_enabled())
end, { desc = "Toggle inlay hints" })

-- 診断
map("n", "<leader>cd", vim.diagnostic.open_float, { desc = "Line diagnostic" })

-- Copilot 受諾系（copilot.lua の suggestion keymap でも対応）
-- accept は <C-j>, dismiss は <C-h>（pack.lua の copilot.setup を参照）
