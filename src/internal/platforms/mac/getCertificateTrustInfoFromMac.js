import { exec } from "@jsenv/https-localhost/src/internal/exec.js"
import { commandSign, infoSign, okSign } from "@jsenv/https-localhost/src/internal/logs.js"

export const getCertificateTrustInfoFromMac = async ({ logger, certificate }) => {
  const findCertificateCommand = `security find-certificate -a -p`

  logger.debug(`Searching certificate in mac keychain...`)
  logger.debug(`${commandSign} ${findCertificateCommand}`)

  const findCertificateCommandOutput = await exec(findCertificateCommand)
  const certificateFoundInCommandOutput = findCertificateCommandOutput.includes(certificate)

  if (!certificateFoundInCommandOutput) {
    logger.debug(`${infoSign} certificate is not in keychain`)
    return {
      status: "not_trusted",
      reason: `not found in mac keychain`,
    }
  }

  logger.debug(`${okSign} certificate found in keychain`)
  return {
    status: "trusted",
    reason: "found in mac keychain",
  }
}
