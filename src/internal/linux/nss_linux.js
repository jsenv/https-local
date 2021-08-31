import { memoize } from "@jsenv/local-https-certificates/src/internal/memoize.js"
import { commandSign, infoSign, okSign } from "@jsenv/local-https-certificates/src/internal/logs.js"
import { exec } from "@jsenv/local-https-certificates/src/internal/exec.js"

export const nssCommandName = "libnss3-tools"

export const detectIfNSSIsInstalled = memoize(async ({ logger }) => {
  logger.debug(`Detect if nss installed....`)

  const aptCommand = `apt list libnss3-tools --installed`
  logger.debug(`${commandSign} ${aptCommand}`)
  const aptCommandOutput = await exec(aptCommand)

  if (aptCommandOutput.length > 0) {
    logger.debug(`${okSign} libnss3-tools is installed`)
    return true
  }

  logger.debug(`${infoSign} libnss3-tools not installed`)
  return false
})

export const getCertutilBinPath = () => "certutil"

export const getNSSDynamicInstallInfo = () => {
  return {
    isInstallable: true,
    installNss: async ({ logger }) => {
      const aptInstallCommand = `sudo apt install libnss3-tools`
      logger.info(`"libnss3-tools" is not installed, trying to install "libnss3-tools"`)
      logger.info(`${commandSign} ${aptInstallCommand}`)
      await exec(aptInstallCommand)
    },
  }
}
