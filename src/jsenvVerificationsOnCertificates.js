import { importPlatformMethods } from "./internal/platform.js"

export const jsenvVerificationsOnCertificates = async ({
  logger,
  rootCertificateStatus,
  rootCertificateFilePath,
  rootCertificate,

  certificateTrustVerification,
  tryToTrustRootCertificate,

  certificateHostnamesVerification,
  tryToRegisterHostnames,

  serverCertificateAltNames,
}) => {
  const { ensureRootCertificateRegistration, ensureHostnamesRegistration } =
    await importPlatformMethods()

  if (certificateTrustVerification) {
    await ensureRootCertificateRegistration({
      logger,
      rootCertificateFilePath,
      rootCertificateStatus,
      rootCertificate,

      tryToTrustRootCertificate,
    })
  }

  if (certificateHostnamesVerification) {
    await ensureHostnamesRegistration({
      logger,
      serverCertificateAltNames,

      tryToRegisterHostnames,
    })
  }
}
