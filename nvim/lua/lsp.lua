-- 0.12 ネイティブ LSP: vim.lsp.config + vim.lsp.enable
local capabilities = vim.lsp.protocol.make_client_capabilities()
local ok, blink = pcall(require, "blink.cmp")
if ok and blink.get_lsp_capabilities then
  capabilities = blink.get_lsp_capabilities(capabilities)
end

vim.lsp.config("*", {
  capabilities = capabilities,
  root_markers = { ".git", ".hg" },
})

vim.lsp.config("lua_ls", {
  settings = {
    Lua = {
      runtime = { version = "LuaJIT" },
      workspace = {
        checkThirdParty = false,
        library = vim.api.nvim_get_runtime_file("", true),
      },
      diagnostics = { globals = { "vim", "Snacks" } },
      hint = { enable = true },
      telemetry = { enable = false },
    },
  },
})

vim.lsp.config("vtsls", {
  settings = {
    typescript = {
      inlayHints = {
        parameterNames = { enabled = "literals" },
        variableTypes = { enabled = false },
        propertyDeclarationTypes = { enabled = true },
        functionLikeReturnTypes = { enabled = true },
      },
    },
    javascript = {
      inlayHints = {
        parameterNames = { enabled = "literals" },
        variableTypes = { enabled = false },
      },
    },
    vtsls = {
      experimental = { completion = { enableServerSideFuzzyMatch = true } },
    },
  },
})

vim.lsp.config("yamlls", {
  settings = {
    yaml = {
      schemaStore = { enable = true, url = "https://www.schemastore.org/api/json/catalog.json" },
      keyOrdering = false,
    },
  },
})

vim.lsp.config("jsonls", {
  settings = {
    json = { validate = { enable = true } },
  },
})

-- インストール済みのサーバーを有効化（mason 経由でインストールされたものは PATH に通る）
vim.lsp.enable({
  "lua_ls",
  "vtsls",
  "pyright",
  "gopls",
  "rust_analyzer",
  "bashls",
  "jsonls",
  "yamlls",
  "tailwindcss",
  "html",
  "cssls",
  "marksman",
  "taplo",
  "terraformls",
})
