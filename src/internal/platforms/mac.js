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
    newAndTryToTrustDisabled,
    // chrome needs macTrustInfo because it uses OS trust store
    macTrustInfo,
  })

  const safariTrustInfo = await safariTrustStore.getCertificateTrustInfo({
    logger,
    newAndTryToTrustDisabled,
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
  const macTrustInfo = await macTrustStore.addCertificate({
    logger,
    certificateFileUrl,
    existingTrustInfo,
  })

  const chromeTrustInfo = await chromeTrustStoreOnMac.addCertificate({
    logger,
    // chrome needs macTrustInfo because it uses OS trust store
    macTrustInfo,
    existingTrustInfo,
  })

  const firefoxTrustInfo = await firefoxTrustStoreOnMac.addCertificate({
    logger,
    certificate,
    certificateFileUrl,
    certificateCommonName,
    NSSDynamicInstall,
    existingTrustInfo,
  })

  const safariTrustInfo = await safariTrustStore.addCertificate({
    logger,
    // safari needs macTrustInfo because it uses OS trust store
    macTrustInfo,
    existingTrustInfo,
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
