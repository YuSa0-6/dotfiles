local M = {}

M.apply_transparency = function()
  for _, group in ipairs({
    "Normal",
    "NormalFloat",
    "SignColumn",
    "LineNr",
    "Folded",
    "NonText",
    "SpecialKey",
    "VertSplit",
    "EndOfBuffer",
    "FloatBorder",
    "TelescopeNormal",
    "MiniPickBorder",
    "MiniFilesNormal",
  }) do
    vim.cmd(("hi %s guibg=NONE ctermbg=NONE"):format(group))
  end
end

return M
