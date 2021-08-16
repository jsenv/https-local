/*
 * https://manuals.gfi.com/en/kerio/connect/content/server-configuration/ssl-certificates/adding-trusted-root-certificates-to-the-server-1605.html
 */

import { importPlatformMethods } from "./platform.js"

const getHowToRegisterRootCertificate = async ({
  logger,
  rootCertificateFilePath,
  rootCertificatePEM,
}) => {
  const { describeHowToRegisterRootCertificate } = await importPlatformMethods()
  return describeHowToRegisterRootCertificate({
    logger,
    rootCertificateFilePath,
    rootCertificatePEM,
  })
}

const getHowToUnregisterRootCertificate = async ({ rootCertificateFilePath }) => {
  const { describeHowToUnregisterRootCertificate } = await importPlatformMethods()
  return describeHowToUnregisterRootCertificate({ rootCertificateFilePath })
}

export const platformTrustStore = {
  getHowToRegisterRootCertificate,
  getHowToUnregisterRootCertificate,
}
