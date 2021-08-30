import { linuxTrustStore } from "./linux_trust_store.js"
import { firefoxTrustStoreOnLinux } from "./firefox_trust_store_on_linux.js"
import { chromeTrustStoreOnLinux } from "./chrome_trust_store_on_linux.js"

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

  const chromeTrustInfo = await chromeTrustStoreOnLinux.getCertificateTrustInfo({
    logger,
    certificate,
    certificateCommonName,
    newAndTryToTrustDisabled,
  })

  const firefoxTrustInfo = await firefoxTrustStoreOnLinux.getCertificateTrustInfo({
    logger,
    certificate,
    certificateCommonName,
    newAndTryToTrustDisabled,
  })

  return {
    linux: linuxTrustInfo,
    chrome: chromeTrustInfo,
    firefox: firefoxTrustInfo,
  }
}

export const addCertificateToTrustStores = async ({
  logger,
  certificateCommonName,
  certificateFileUrl,
  NSSDynamicInstall,
  existingTrustInfo,
}) => {
  const linuxTrustInfo = await linuxTrustStore.addCertificate({
    logger,
    certificateFileUrl,
    existingTrustInfo,
  })

  const chromeTrustInfo = await chromeTrustStoreOnLinux.addCertificate({
    logger,
    certificateFileUrl,
    certificateCommonName,
    NSSDynamicInstall,
    existingTrustInfo,
  })

  const firefoxTrustInfo = await firefoxTrustStoreOnLinux.addCertificate({
    logger,
    certificateFileUrl,
    certificateCommonName,
    NSSDynamicInstall,
    existingTrustInfo,
  })

  return {
    linux: linuxTrustInfo,
    chrome: chromeTrustInfo,
    firefox: firefoxTrustInfo,
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

  await chromeTrustStoreOnLinux.removeCertificate({
    logger,
    certificateCommonName,
    certificateFileUrl,
  })

  await firefoxTrustStoreOnLinux.removeCertificate({
    logger,
    certificateCommonName,
    certificateFileUrl,
  })
}
