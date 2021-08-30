import { assertAndNormalizeDirectoryUrl, resolveUrl, urlToFileSystemPath } from "@jsenv/filesystem"

import { memoize } from "@jsenv/local-https-certificates/src/internal/memoize.js"
import { exec } from "@jsenv/local-https-certificates/src/internal/exec.js"
import { infoSign, okSign } from "@jsenv/local-https-certificates/src/internal/logs.js"

export const detectNSSCommand = async ({ logger }) => {
  logger.debug(`Detecting nss command....`)
  const brewListCommand = `brew list -1`

  try {
    const brewListCommandOutput = await exec(brewListCommand)
    const nssFound = brewListCommandOutput.includes("\nnss\n")
    logger.debug(`${okSign} nss command detected`)
    return nssFound
  } catch (e) {
    logger.debug(`${infoSign} nss command not detected`)
    return false
  }
}

export const getCertutilBinPath = memoize(async () => {
  const brewCommand = `brew --prefix nss`
  const brewCommandOutput = await exec(brewCommand)
  const nssCommandDirectoryUrl = assertAndNormalizeDirectoryUrl(brewCommandOutput.trim())
  const certutilBinUrl = resolveUrl(`./bin/certutil`, nssCommandDirectoryUrl)
  const certutilBinPath = urlToFileSystemPath(certutilBinUrl)
  return certutilBinPath
})
