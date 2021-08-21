import { existsSync } from "node:fs"
import { assertAndNormalizeDirectoryUrl, resolveUrl } from "@jsenv/filesystem"

export const detectFirefox = () => {
  return existsSync("/Applications/Firefox.app")
}

export const firefoxNSSDBDirectoryUrl = resolveUrl(
  `./Library/Application Support/Firefox/Profiles/`,
  assertAndNormalizeDirectoryUrl(process.env.HOME),
)
