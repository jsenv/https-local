/*
 * Missing things that would be nice to have:
 * - A way to detect firefox on windows
 * - A way to install and use NSS command on windows to update firefox NSS dabatase file
 *
 * see
 * - https://github.com/davewasmer/devcert/blob/master/src/platforms/darwin.ts
 * - https://www.unix.com/man-page/mojave/1/security/
 */

import { okSign, infoSign } from "@jsenv/https-localhost/src/internal/logs.js"

import {
  getCertificateTrustInfoFromWindows,
  addCertificateInWindowsTrustStore,
  removeCertificateFromWindowsTrustStore,
} from "./windows/windows_trust_store.js"

export const getNewCertificateTrustInfo = ({ logger }) => {
  const windowsTrustInfo = {
    status: "not_trusted",
    reason: "tryToTrust disabled",
  }
  logger.info(`${infoSign} You should add certificate to windows`)

  return {
    windows: windowsTrustInfo,
  }
}

export const getCertificateTrustInfo = async ({ logger, certificate, certificateCommonName }) => {
  logger.info(`Check if certificate is trusted by windows...`)
  const windowsTrustInfo = await getCertificateTrustInfoFromWindows({
    logger,
    certificate,
    certificateCommonName,
  })
  if (windowsTrustInfo.status === "trusted") {
    logger.info(`${okSign} certificate trusted by windows`)
  } else {
    logger.info(`${infoSign} certificate not trusted by windows`)
  }

  return {
    windows: windowsTrustInfo,
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

  return {
    windows: windowsTrustInfo,
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
