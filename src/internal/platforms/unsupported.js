const { platform } = process

export const addRootCertificateFileToTrustStore = async ({ logger }) => {
  logger.debug(`"${platform}" is unsupported: cannot add root certificate to trust store`)
  return false
}

export const removeRootCertificateFileFromTrustStore = async ({ logger }) => {
  logger.debug(`"${platform}" is unsupported: cannot remove root certificate from trust store`)
  return false
}
