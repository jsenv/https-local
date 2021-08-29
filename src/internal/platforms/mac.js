/*
 * see
 * - https://github.com/davewasmer/devcert/blob/master/src/platforms/darwin.ts
 * - https://www.unix.com/man-page/mojave/1/security/
 */

import { macTrustStore } from "./mac/mac_trust_store.js"
import { chromeTrustStoreOnMac } from "./mac/chrome_trust_store_on_mac.js"
import { firefoxTrustStoreOnMac } from "./mac/firefox_trust_store_on_mac.js"
import { safariTrustStore } from "./mac/safari_trust_store.js"

export const getCertificateTrustInfo = async ({
  logger,
  newAndTryToTrustDisabled,
  certificate,
  certificateCommonName,
}) => {
  const macTrustInfo = await macTrustStore.getCertificateTrustInfo({
    logger,
    newAndTryToTrustDisabled,
    certificate,
    certificateCommonName,
  })

  const chromeTrustInfo = await chromeTrustStoreOnMac.getCertificateTrustInfo({
    logger,
    // chrome needs macTrustInfo because it uses OS trust store
    macTrustInfo,
  })

  const safariTrustInfo = await safariTrustStore.getCertificateTrustInfo({
    logger,
    // safari needs macTrustInfo because it uses OS trust store
    macTrustInfo,
  })

  const firefoxTrustInfo = await firefoxTrustStoreOnMac.getCertificateTrustInfo({
    logger,
    newAndTryToTrustDisabled,
    certificate,
    certificateCommonName,
  })

  return {
    mac: macTrustInfo,
    chrome: chromeTrustInfo,
    firefox: firefoxTrustInfo,
    safari: safariTrustInfo,
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

  const chromeTrustInfo = await putInChromeTrustStoreIfNeeded({
    logger,
    // chrome needs macTrustInfo because it uses OS trust store
    macTrustInfo,
    existingChromeTrustInfo: existingTrustInfo ? existingTrustInfo.chrome : null,
  })

  const firefoxTrustInfo = await putInFirefoxTrustStoreIfNeeded({
    logger,
    certificate,
    certificateFileUrl,
    certificateCommonName,
    NSSDynamicInstall,
    existingFirefoxTrustInfo: existingTrustInfo ? existingTrustInfo.firefox : null,
  })

  const safariTrustInfo = await putInSafariTrustStoreIfNeeded({
    logger,
    // safari needs macTrustInfo because it uses OS trust store
    macTrustInfo,
    existingSafariTrustInfo: existingTrustInfo ? existingTrustInfo.safari : null,
  })

  return {
    mac: macTrustInfo,
    chrome: chromeTrustInfo,
    firefox: firefoxTrustInfo,
    safari: safariTrustInfo,
  }
}

export const removeCertificateFromTrustStores = async ({
  logger,
  certificate,
  certificateFileUrl,
  certificateCommonName,
}) => {
  const macTrustInfo = await macTrustStore.removeCertificate({
    logger,
    certificate,
    certificateFileUrl,
    certificateCommonName,
  })

  await chromeTrustStoreOnMac.removeCertificate({
    logger,
    // chrome needs macTrustInfo because it uses OS trust store
    macTrustInfo,
  })

  await safariTrustStore.removeCertificate({
    logger,
    // safari needs macTrustInfo because it uses OS trust store
    macTrustInfo,
  })

  await firefoxTrustStoreOnMac.removeCertificate({
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

  return await macTrustStore.addCertificate({
    logger,
    certificateFileUrl,
  })
}

const putInChromeTrustStoreIfNeeded = async ({ logger, macTrustInfo, existingChromeTrustInfo }) => {
  if (existingChromeTrustInfo && existingChromeTrustInfo.status !== "not_trusted") {
    return existingChromeTrustInfo
  }

  return await chromeTrustStoreOnMac.addCertificate({
    logger,
    macTrustInfo,
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

  return await firefoxTrustStoreOnMac.addCertificate({
    logger,
    certificate,
    certificateFileUrl,
    certificateCommonName,
    NSSDynamicInstall,
  })
}

const putInSafariTrustStoreIfNeeded = async ({ logger, macTrustInfo, existingSafariTrustInfo }) => {
  if (existingSafariTrustInfo && existingSafariTrustInfo.status !== "not_trusted") {
    return existingSafariTrustInfo
  }

  return await safariTrustStore.addCertificate({
    logger,
    macTrustInfo,
  })
}
