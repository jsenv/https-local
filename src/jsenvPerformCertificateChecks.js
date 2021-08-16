import { importPlatformMethods } from "./internal/platform.js"

export const jsenvPerformCertificateChecks = async ({
  logger,
  rootCertificateStatus,
  rootCertificateFilePath,
  rootCertificate,
  tryToTrustRootCertificate,

  serverCertificateAltNames,
}) => {
  const { ensureRootCertificateRegistration, ensureHostnamesRegistration } =
    await importPlatformMethods()

  await ensureRootCertificateRegistration({
    logger,
    rootCertificateFilePath,
    rootCertificateStatus,
    rootCertificate,
    tryToTrustRootCertificate,
  })
  await ensureHostnamesRegistration({
    logger,
    serverCertificateAltNames,
  })
}
