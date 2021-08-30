import { assertAndNormalizeDirectoryUrl, resolveUrl, urlToFileSystemPath } from "@jsenv/filesystem"

import { memoize } from "@jsenv/local-https-certificates/src/internal/memoize.js"
import { exec } from "@jsenv/local-https-certificates/src/internal/exec.js"
import { infoSign, okSign } from "@jsenv/local-https-certificates/src/internal/logs.js"

export const detectIfNSSIsInstalled = async ({ logger }) => {
  logger.debug(`Detecting if nss is installed....`)
  const brewListCommand = `brew list --versions nss`

  try {
    await exec(brewListCommand)
    logger.debug(`${okSign} nss is installed`)
    return true
  } catch (e) {
    logger.debug(`${infoSign} nss not installed`)
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
