import { importPlatformMethods } from "./internal/platform.js"

export const jsenvOnServerCertificateReady = async ({
  logger,
  rootCertificateStatus,
  rootCertificateFilePath,
  rootCertificate,

  serverCertificateAltNames,
}) => {
  const { ensureRootCertificateRegistration, ensureHostnamesRegistration } =
    await importPlatformMethods()

  await ensureRootCertificateRegistration({
    logger,
    rootCertificateFilePath,
    rootCertificateStatus,
    rootCertificate,
  })
  await ensureHostnamesRegistration({
    logger,
    serverCertificateAltNames,
  })
}
