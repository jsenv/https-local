import { createRequire } from "node:module"

const require = createRequire(import.meta.url)

export const importNodeForge = async () => {
  return require("node-forge")
}
