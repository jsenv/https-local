// TODO: add chrome and firefox trust store

import { linuxTrustStore } from "./linux/linux_trust_store.js"

export const getCertificateTrustInfo = async ({
  logger,
  newAndTryToTrustDisabled,
  certificate,
  certificateCommonName,
}) => {
  const linuxTrustInfo = await linuxTrustStore.getCertificateTrustInfo({
    logger,
    certificate,
    certificateCommonName,
    newAndTryToTrustDisabled,
  })

  return {
    linux: linuxTrustInfo,
  }
}

export const addCertificateToTrustStores = async ({
  logger,
  certificateFileUrl,
  existingTrustInfo,
}) => {
  const linuxTrustInfo = await linuxTrustStore.addCertificate({
    logger,
    certificateFileUrl,
    existingTrustInfo,
  })

  return {
    linux: linuxTrustInfo,
  }
}

export const removeCertificateFromTrustStores = async ({
  logger,
  certificate,
  certificateFileUrl,
  certificateCommonName,
}) => {
  await linuxTrustStore.removeCertificate({
    logger,
    certificate,
    certificateFileUrl,
    certificateCommonName,
  })
}
