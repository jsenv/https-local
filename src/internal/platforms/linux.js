// TODO: add chrome and firefox trust store

import { okSign, infoSign } from "@jsenv/https-localhost/src/internal/logs.js"

import {
  getCertificateTrustInfoFromLinux,
  addCertificateInLinuxTrustStore,
  removeCertificateFromLinuxTrustStore,
} from "./linux/linux_trust_store.js"

export const getNewCertificateTrustInfo = ({ logger }) => {
  const linuxTrustInfo = {
    status: "not_trusted",
    reason: "tryToTrust disabled",
  }
  logger.info(`${infoSign} You should add certificate to linux`)

  return {
    linux: linuxTrustInfo,
  }
}

export const getCertificateTrustInfo = async ({ logger, certificate, certificateCommonName }) => {
  logger.info(`Check if certificate is trusted by linux...`)
  const linuxTrustInfo = await getCertificateTrustInfoFromLinux({
    logger,
    certificate,
    certificateCommonName,
  })
  if (linuxTrustInfo.status === "trusted") {
    logger.info(`${okSign} certificate trusted by linux`)
  } else {
    logger.info(`${infoSign} certificate not trusted by linux`)
  }

  return {
    linux: linuxTrustInfo,
  }
}

export const addCertificateToTrustStores = async ({
  logger,
  certificateFileUrl,
  existingTrustInfo,
}) => {
  const linuxTrustInfo = await putInLinuxTrustStoreIfNeeded({
    logger,
    certificateFileUrl,
    existingLinuxTrustInfo: existingTrustInfo ? existingTrustInfo.linux : null,
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
  await removeCertificateFromLinuxTrustStore({
    logger,
    certificate,
    certificateFileUrl,
    certificateCommonName,
  })
}

const putInLinuxTrustStoreIfNeeded = async ({
  logger,
  certificateFileUrl,
  existingLinuxTrustInfo,
}) => {
  if (existingLinuxTrustInfo && existingLinuxTrustInfo.status !== "not_trusted") {
    return existingLinuxTrustInfo
  }

  return await addCertificateInLinuxTrustStore({
    logger,
    certificateFileUrl,
  })
}
