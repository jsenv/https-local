import { assertAndNormalizeDirectoryUrl, resolveUrl, urlToFileSystemPath } from "@jsenv/filesystem"

import { memoize } from "@jsenv/https-local/src/internal/memoize.js"
import { exec } from "@jsenv/https-local/src/internal/exec.js"
import { infoSign, okSign } from "@jsenv/https-local/src/internal/logs.js"
import { commandExists } from "@jsenv/https-local/src/internal/command.js"

export const nssCommandName = "nss"

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

export const getNSSDynamicInstallInfo = () => {
  return {
    isInstallable: commandExists("brew"),
    nssNotInstallableReason: `"brew" is not available`,
    nssInstallFixSuggestion: `install "brew" on this mac`,
    installNss: async ({ logger }) => {
      const brewInstallCommand = `brew install nss`
      logger.info(`"nss" is not installed, trying to install "nss" via Homebrew`)
      logger.info(`> ${brewInstallCommand}`)
      await exec(brewInstallCommand)
    },
  }
}
