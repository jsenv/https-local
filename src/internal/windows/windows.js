/*
 * see
 * - https://github.com/davewasmer/devcert/blob/master/src/platforms/darwin.ts
 * - https://www.unix.com/man-page/mojave/1/security/
 */

import { windowsTrustStore } from "./windows_trust_store.js"
import { chromeTrustStoreOnWindows } from "./chrome_trust_store_on_windows.js"
import { edgeTrustStore } from "./edge_trust_store.js"
import { firefoxTrustStoreOnWindows } from "./firefox_trust_store_on_windows.js"

export const getCertificateTrustInfo = async ({
  logger,
  newAndTryToTrustDisabled,
  certificate,
  certificateCommonName,
}) => {
  const windowsTrustInfo = await windowsTrustStore.getCertificateTrustInfo({
    logger,
    newAndTryToTrustDisabled,
    certificate,
    certificateCommonName,
  })

  const chromeTrustInfo = await chromeTrustStoreOnWindows.getCertificateTrustInfo({
    logger,
    // chrome needs windowsTrustInfo because it uses OS trust store
    windowsTrustInfo,
  })

  const edgeTrustInfo = await edgeTrustStore.getCertificateTrustInfo({
    logger,
    // edge needs windowsTrustInfo because it uses OS trust store
    windowsTrustInfo,
  })

  const firefoxTrustInfo = await firefoxTrustStoreOnWindows.getCertificateTrustInfo({
    logger,
    newAndTryToTrustDisabled,
  })

  return {
    windows: windowsTrustInfo,
    chrome: chromeTrustInfo,
    edge: edgeTrustInfo,
    firefox: firefoxTrustInfo,
  }
}

export const addCertificateToTrustStores = async ({
  logger,
  certificateFileUrl,
  existingTrustInfo,
}) => {
  const windowsTrustInfo = await windowsTrustStore.addCertificate({
    logger,
    certificateFileUrl,
    existingTrustInfo,
  })

  const chromeTrustInfo = await chromeTrustStoreOnWindows.addCertificate({
    logger,
    // chrome needs windowsTrustInfo because it uses OS trust store
    windowsTrustInfo,
    existingTrustInfo,
  })

  const edgeTrustInfo = await edgeTrustStore.addCertificate({
    logger,
    // edge needs windowsTrustInfo because it uses OS trust store
    windowsTrustInfo,
  })

  const firefoxTrustInfo = await firefoxTrustStoreOnWindows.addCertificate({
    logger,
    certificateFileUrl,
    existingTrustInfo,
  })

  return {
    windows: windowsTrustInfo,
    chrome: chromeTrustInfo,
    edge: edgeTrustInfo,
    firefox: firefoxTrustInfo,
  }
}

export const removeCertificateFromTrustStores = async ({
  logger,
  certificate,
  certificateFileUrl,
  certificateCommonName,
}) => {
  const windowsTrustInfo = await windowsTrustStore.removeCertificate({
    logger,
    certificate,
    certificateFileUrl,
    certificateCommonName,
  })

  await chromeTrustStoreOnWindows.removeCertificate({
    logger,
    // chrome needs windowsTrustInfo because it uses OS trust store
    windowsTrustInfo,
  })

  await edgeTrustStore.removeCertificate({
    logger,
    // edge needs windowsTrustInfo because it uses OS trust store
    windowsTrustInfo,
  })

  await firefoxTrustStoreOnWindows.removeCertificate({
    logger,
    certificate,
  })
}
