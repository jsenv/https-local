import { importPlatformMethods } from "./platform.js"

export const jsenvVerificationsOnCertificates = async ({
  logger,
  rootCertificateStatus,
  rootCertificateFileUrl,
  rootCertificateSymlinkUrl,
  rootCertificatePEM,

  certificateTrustVerification,
  tryToTrustRootCertificate,

  certificateHostnamesVerification,
  tryToRegisterHostnames,
  hostsFilePath,

  serverCertificateAltNames,
}) => {
  const { ensureRootCertificateRegistration, ensureHostnamesRegistration } =
    await importPlatformMethods()

  if (certificateTrustVerification) {
    await ensureRootCertificateRegistration({
      logger,
      rootCertificateFileUrl,
      rootCertificateSymlinkUrl,
      rootCertificateStatus,
      rootCertificatePEM,

      tryToTrustRootCertificate,
    })
  }

  if (certificateHostnamesVerification) {
    await ensureHostnamesRegistration({
      logger,
      serverCertificateAltNames,

      tryToRegisterHostnames,
      hostsFilePath,
    })
  }
}
