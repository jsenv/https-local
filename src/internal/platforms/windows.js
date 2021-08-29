/*
 * see
 * - https://github.com/davewasmer/devcert/blob/master/src/platforms/darwin.ts
 * - https://www.unix.com/man-page/mojave/1/security/
 */

import {
  getCertificateTrustInfoFromWindows,
  addCertificateInWindowsTrustStore,
  removeCertificateFromWindowsTrustStore,
} from "./windows/windows_trust_store.js"
import {
  getCertificateTrustInfoFromFirefox,
  addCertificateInFirefoxTrustStore,
  removeCertificateFromFirefoxTrustStore,
} from "./windows/firefox_trust_store.js"

export const getCertificateTrustInfo = async ({
  logger,
  newAndTryToTrustDisabled,
  certificate,
  certificateCommonName,
}) => {
  const windowsTrustInfo = await getCertificateTrustInfoFromWindows({
    logger,
    newAndTryToTrustDisabled,
    certificate,
    certificateCommonName,
  })

  const firefoxTrustInfo = await getCertificateTrustInfoFromFirefox({
    logger,
    newAndTryToTrustDisabled,
  })

  // chrome use OS trust store
  const chromeTrustInfo = { ...windowsTrustInfo }

  return {
    windows: windowsTrustInfo,
    chrome: chromeTrustInfo,
    firefox: firefoxTrustInfo,
  }
}

export const addCertificateToTrustStores = async ({
  logger,
  certificateFileUrl,
  existingTrustInfo,
}) => {
  const windowsTrustInfo = await putInWindowsTrustStoreIfNeeded({
    logger,
    certificateFileUrl,
    existingWindowsTrustInfo: existingTrustInfo ? existingTrustInfo.windows : null,
  })

  // chrome use OS trust store
  const chromeTrustInfo = { ...windowsTrustInfo }

  const firefoxTrustInfo = await putInFirefoxTrustStoreIfNeeded({
    logger,
    certificateFileUrl,
    existingWindowsTrustInfo: existingTrustInfo ? existingTrustInfo.windows : null,
  })

  return {
    windows: windowsTrustInfo,
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
  await removeCertificateFromWindowsTrustStore({
    logger,
    certificate,
    certificateFileUrl,
    certificateCommonName,
  })

  // no need for chrome, it uses OS trust stores

  await removeCertificateFromFirefoxTrustStore({
    logger,
    certificate,
  })
}

const putInWindowsTrustStoreIfNeeded = async ({
  logger,
  certificateFileUrl,
  existingWindowsTrustInfo,
}) => {
  if (existingWindowsTrustInfo && existingWindowsTrustInfo.status !== "not_trusted") {
    return existingWindowsTrustInfo
  }

  return await addCertificateInWindowsTrustStore({
    logger,
    certificateFileUrl,
  })
}

const putInFirefoxTrustStoreIfNeeded = async ({
  logger,
  certificateFileUrl,
  existingFirefoxTrustInfo,
}) => {
  if (existingFirefoxTrustInfo && existingFirefoxTrustInfo.status !== "not_trusted") {
    return existingFirefoxTrustInfo
  }

  return await addCertificateInFirefoxTrustStore({
    logger,
    certificateFileUrl,
  })
}
