import { exec } from "../exec.js"

export const getTrustInfoAboutMacOSKeychain = async ({ logger, rootCertificate }) => {
  const findCertificateCommand = `security find-certificate -a -p`
  logger.debug(`> ${findCertificateCommand}`)
  const findCertificateCommandOutput = await exec(findCertificateCommand)
  const rootCertificateFoundInCommandOutput = findCertificateCommandOutput.includes(rootCertificate)

  if (!rootCertificateFoundInCommandOutput) {
    return {
      status: "not_trusted",
      reason: `not found in macOS keychain`,
    }
  }

  return {
    status: "trusted",
    reason: "found in macOS keychain",
  }
}
