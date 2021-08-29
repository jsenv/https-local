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
  getCertificateTrustInfoFromChrome,
  addCertificateInChromeTrustStore,
  removeCertificateFromChromeTrustStore,
} from "./windows/chrome_trust_store.js"
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

  const chromeTrustInfo = await getCertificateTrustInfoFromChrome({
    logger,
    // chrome needs windowsTrustInfo because it uses OS trust store
    windowsTrustInfo,
  })

  const firefoxTrustInfo = await getCertificateTrustInfoFromFirefox({
    logger,
    newAndTryToTrustDisabled,
  })

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

  const chromeTrustInfo = await putInChromeTrustStoreIfNeeded({
    logger,
    // chrome needs windowsTrustInfo because it uses OS trust store
    windowsTrustInfo,
    existingChromeTrustInfo: existingTrustInfo ? existingTrustInfo.chrome : null,
  })

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
  const windowsTrustInfo = await removeCertificateFromWindowsTrustStore({
    logger,
    certificate,
    certificateFileUrl,
    certificateCommonName,
  })

  await removeCertificateFromChromeTrustStore({
    logger,
    // chrome needs windowsTrustInfo because it uses OS trust store
    windowsTrustInfo,
  })

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

const putInChromeTrustStoreIfNeeded = async ({
  logger,
  windowsTrustInfo,
  existingChromeTrustInfo,
}) => {
  if (existingChromeTrustInfo && existingChromeTrustInfo.status !== "not_trusted") {
    return existingChromeTrustInfo
  }

  return await addCertificateInChromeTrustStore({
    logger,
    windowsTrustInfo,
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
