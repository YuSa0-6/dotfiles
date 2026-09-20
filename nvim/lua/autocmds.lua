local aug = vim.api.nvim_create_augroup("user", { clear = true })
local au = vim.api.nvim_create_autocmd

-- yank ハイライト
au("TextYankPost", {
  group = aug,
  callback = function()
    vim.hl.on_yank({ timeout = 200 })
  end,
})

-- 補助バッファは q で閉じる
au("FileType", {
  group = aug,
  pattern = { "help", "qf", "lspinfo", "checkhealth", "man", "notify" },
  callback = function(ev)
    vim.bo[ev.buf].buflisted = false
    vim.keymap.set("n", "q", "<cmd>close<cr>", { buffer = ev.buf, silent = true })
  end,
})

-- 0.12 LSP 拡張機能を LspAttach で有効化
au("LspAttach", {
  group = aug,
  callback = function(args)
    local client = vim.lsp.get_client_by_id(args.data.client_id)
    if not client then return end
    local buf = args.buf

    if vim.lsp.inline_completion and client:supports_method("textDocument/inlineCompletion") then
      pcall(vim.lsp.inline_completion.enable, true, { bufnr = buf })
    end
    if vim.lsp.linked_editing_range and client:supports_method("textDocument/linkedEditingRange") then
      pcall(vim.lsp.linked_editing_range.enable, true, { bufnr = buf })
    end
    if vim.lsp.document_color and client:supports_method("textDocument/documentColor") then
      pcall(vim.lsp.document_color.enable, true, buf)
    end
    if client:supports_method("textDocument/inlayHint") then
      pcall(vim.lsp.inlay_hint.enable, true, { bufnr = buf })
    end
  end,
})

-- InsertLeave で IME を ABC（英字）に戻す
au("InsertLeave", {
  group = aug,
  callback = function()
    if vim.fn.executable("im-select") == 1 then
      vim.fn.system({ "im-select", "com.apple.keylayout.ABC" })
    end
  end,
})

-- 末尾の空白を削除（保存時）
au("BufWritePre", {
  group = aug,
  callback = function()
    local save = vim.fn.winsaveview()
    pcall(vim.cmd, [[%s/\s\+$//e]])
    vim.fn.winrestview(save)
  end,
})
