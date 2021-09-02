import { memoize } from "@jsenv/https-local/src/internal/memoize.js"
import { commandSign, infoSign, okSign } from "@jsenv/https-local/src/internal/logs.js"
import { exec } from "@jsenv/https-local/src/internal/exec.js"

export const nssCommandName = "libnss3-tools"

export const detectIfNSSIsInstalled = memoize(async ({ logger }) => {
  logger.debug(`Detect if nss installed....`)

  const aptCommand = `apt list libnss3-tools --installed`
  logger.debug(`${commandSign} ${aptCommand}`)
  const aptCommandOutput = await exec(aptCommand)

  if (aptCommandOutput.includes("libnss3-tools")) {
    logger.debug(`${okSign} libnss3-tools is installed`)
    return true
  }

  logger.debug(`${infoSign} libnss3-tools not installed`)
  return false
})

export const getCertutilBinPath = () => "certutil"

export const getNSSDynamicInstallInfo = ({ logger }) => {
  return {
    nssIsInstallable: true,
    nssInstall: async () => {
      const aptInstallCommand = `sudo apt install libnss3-tools`
      logger.info(`"libnss3-tools" is not installed, trying to install "libnss3-tools"`)
      logger.info(`${commandSign} ${aptInstallCommand}`)
      await exec(aptInstallCommand)
    },
  }
}
