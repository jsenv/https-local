/*
 * see
 * - https://github.com/davewasmer/devcert/blob/master/src/platforms/darwin.ts
 * - https://www.unix.com/man-page/mojave/1/security/
 */

import {
  getCertificateTrustInfoFromMac,
  addCertificateInMacTrustStore,
  removeCertificateFromMacTrustStore,
} from "./mac/mac_trust_store.js"
import {
  getCertificateTrustInfoFromFirefox,
  addCertificateInFirefoxTrustStore,
  removeCertificateFromFirefoxTrustStore,
} from "./mac/firefox_trust_store.js"

export const getCertificateTrustInfo = async ({
  logger,
  newAndTryToTrustDisabled,
  certificate,
  certificateCommonName,
}) => {
  const macTrustInfo = await getCertificateTrustInfoFromMac({
    logger,
    newAndTryToTrustDisabled,
    certificate,
    certificateCommonName,
  })

  // chrome use OS trust store
  const chromeTrustInfo = { ...macTrustInfo }

  // safari use OS trust store
  const safariTrustInfo = { ...macTrustInfo }

  const firefoxTrustInfo = await getCertificateTrustInfoFromFirefox({
    logger,
    newAndTryToTrustDisabled,
    certificate,
    certificateCommonName,
  })

  return {
    mac: macTrustInfo,
    chrome: chromeTrustInfo,
    safari: safariTrustInfo,
    firefox: firefoxTrustInfo,
  }
}

export const addCertificateToTrustStores = async ({
  logger,
  certificate,
  certificateFileUrl,
  certificateCommonName,
  NSSDynamicInstall,
  existingTrustInfo,
}) => {
  const macTrustInfo = await putInMacTrustStoreIfNeeded({
    logger,
    certificateFileUrl,
    existingMacTrustInfo: existingTrustInfo ? existingTrustInfo.mac : null,
  })

  // chrome use OS trust store
  const chromeTrustInfo = { ...macTrustInfo }

  // safari use OS trust store
  const safariTrustInfo = { ...macTrustInfo }

  const firefoxTrustInfo = await putInFirefoxTrustStoreIfNeeded({
    logger,
    certificate,
    certificateFileUrl,
    certificateCommonName,
    NSSDynamicInstall,
    existingFirefoxTrustInfo: existingTrustInfo ? existingTrustInfo.firefox : null,
  })

  return {
    mac: macTrustInfo,
    chrome: chromeTrustInfo,
    safari: safariTrustInfo,
    firefox: firefoxTrustInfo,
  }
}

export const removeCertificateFromTrustStores = async ({
  logger,
  certificate,
  certificateFileUrl,
  certificateCommonName,
}) => {
  await removeCertificateFromMacTrustStore({
    logger,
    certificate,
    certificateFileUrl,
    certificateCommonName,
  })

  // no need for chrome and safari, they are handled by mac keychain

  await removeCertificateFromFirefoxTrustStore({
    logger,
    certificate,
    certificateFileUrl,
    certificateCommonName,
  })
}

const putInMacTrustStoreIfNeeded = async ({ logger, certificateFileUrl, existingMacTrustInfo }) => {
  if (existingMacTrustInfo && existingMacTrustInfo.status !== "not_trusted") {
    return existingMacTrustInfo
  }

  return await addCertificateInMacTrustStore({
    logger,
    certificateFileUrl,
  })
}

const putInFirefoxTrustStoreIfNeeded = async ({
  logger,
  certificate,
  certificateFileUrl,
  certificateCommonName,
  NSSDynamicInstall,
  existingFirefoxTrustInfo,
}) => {
  if (existingFirefoxTrustInfo && existingFirefoxTrustInfo.status !== "not_trusted") {
    return existingFirefoxTrustInfo
  }

  return await addCertificateInFirefoxTrustStore({
    logger,
    certificate,
    certificateFileUrl,
    certificateCommonName,
    NSSDynamicInstall,
  })
}
