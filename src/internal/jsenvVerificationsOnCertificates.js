import { importPlatformMethods } from "./platform.js"

export const jsenvVerificationsOnCertificates = async ({
  logger,
  rootCertificateStatus,
  rootCertificateFileUrl,
  rootCertificate,

  certificateTrustVerification,
  tryToTrustRootCertificate,

  certificateHostnamesVerification,
  tryToRegisterHostnames,
  hostsFilePath,

  serverCertificateFileUrl,
  serverCertificateAltNames,
}) => {
  const { ensureRootCertificateRegistration, ensureHostnamesRegistration } =
    await importPlatformMethods()

  if (certificateTrustVerification) {
    await ensureRootCertificateRegistration({
      logger,
      rootCertificateFileUrl,
      rootCertificateStatus,
      rootCertificate,

      tryToTrustRootCertificate,

      serverCertificateFileUrl,
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
