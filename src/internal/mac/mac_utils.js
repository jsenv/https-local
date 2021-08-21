import { exec } from "../exec.js"

import { assertAndNormalizeDirectoryUrl, resolveUrl, urlToFileSystemPath } from "@jsenv/filesystem"

export const detectCertutil = async () => {
  const brewListCommand = `brew list -1`

  try {
    const brewListCommandOutput = await exec(brewListCommand)
    const nssFound = brewListCommandOutput.includes("\nnss\n")
    return nssFound
  } catch (e) {
    return false
  }
}

export const getCertutilBinPath = async () => {
  const brewCommand = `brew --prefix nss`
  const brewCommandOutput = await exec(brewCommand)
  const nssCommandDirectoryUrl = assertAndNormalizeDirectoryUrl(brewCommandOutput.trim())
  const certutilBinUrl = resolveUrl(`./bin/certutil`, nssCommandDirectoryUrl)
  const certutilBinPath = urlToFileSystemPath(certutilBinUrl)
  return certutilBinPath
}
