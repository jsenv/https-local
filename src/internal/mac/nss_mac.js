import { fileURLToPath } from "node:url"
import { assertAndNormalizeDirectoryUrl } from "@jsenv/filesystem"
import { UNICODE } from "@jsenv/log"

import { memoize } from "@jsenv/https-local/src/internal/memoize.js"
import { exec } from "@jsenv/https-local/src/internal/exec.js"
import { commandExists } from "@jsenv/https-local/src/internal/command.js"

export const nssCommandName = "nss"

export const detectIfNSSIsInstalled = async ({ logger }) => {
  logger.debug(`Detecting if nss is installed....`)
  const brewListCommand = `brew list --versions nss`

  try {
    await exec(brewListCommand)
    logger.debug(`${UNICODE.OK} nss is installed`)
    return true
  } catch (e) {
    logger.debug(`${UNICODE.INFO} nss not installed`)
    return false
  }
}

export const getCertutilBinPath = memoize(async () => {
  const brewCommand = `brew --prefix nss`
  const brewCommandOutput = await exec(brewCommand)
  const nssCommandDirectoryUrl = assertAndNormalizeDirectoryUrl(
    brewCommandOutput.trim(),
  )
  const certutilBinUrl = new URL(`./bin/certutil`, nssCommandDirectoryUrl).href
  const certutilBinPath = fileURLToPath(certutilBinUrl)
  return certutilBinPath
})

export const getNSSDynamicInstallInfo = () => {
  return {
    isInstallable: commandExists("brew"),
    notInstallableReason: `"brew" is not available`,
    suggestion: `install "brew" on this mac`,
    install: async ({ logger }) => {
      const brewInstallCommand = `brew install nss`
      logger.info(
        `"nss" is not installed, trying to install "nss" via Homebrew`,
      )
      logger.info(`${UNICODE.COMMAND} ${brewInstallCommand}`)
      await exec(brewInstallCommand)
    },
  }
}
