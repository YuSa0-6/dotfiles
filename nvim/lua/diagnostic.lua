vim.diagnostic.config({
  virtual_lines = { current_line = true },
  virtual_text = false,
  underline = true,
  update_in_insert = false,
  severity_sort = true,
  jump = { float = true },
  signs = {
    text = {
      [vim.diagnostic.severity.ERROR] = "",
      [vim.diagnostic.severity.WARN] = "",
      [vim.diagnostic.severity.INFO] = "",
      [vim.diagnostic.severity.HINT] = "",
    },
  },
  float = { border = "rounded", source = true },
})
