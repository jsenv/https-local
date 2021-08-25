import { createRequire } from "node:module"

const require = createRequire(import.meta.url)

export const importSudoPrompt = async () => {
  return require("sudo-prompt")
}
