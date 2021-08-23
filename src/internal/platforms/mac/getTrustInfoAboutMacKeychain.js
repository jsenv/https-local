import { exec } from "@jsenv/https-localhost/src/internal/exec.js"
import { commandSign, infoSign, okSign } from "@jsenv/https-localhost/src/internal/logs.js"

export const getTrustInfoAboutMacKeychain = async ({ logger, rootCertificate }) => {
  const findCertificateCommand = `security find-certificate -a -p`

  logger.debug(`Searching root certificate in mac keychain...`)
  logger.debug(`${commandSign} ${findCertificateCommand}`)

  const findCertificateCommandOutput = await exec(findCertificateCommand)
  const rootCertificateFoundInCommandOutput = findCertificateCommandOutput.includes(rootCertificate)

  if (!rootCertificateFoundInCommandOutput) {
    logger.debug(`${infoSign} root certificate is not in keychain`)
    return {
      status: "not_trusted",
      reason: `not found in mac keychain`,
    }
  }

  logger.debug(`${okSign} root certificate found in keychain`)
  return {
    status: "trusted",
    reason: "found in mac keychain",
  }
}
