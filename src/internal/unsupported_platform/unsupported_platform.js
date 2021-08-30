import { warningSign } from "@jsenv/local-https-certificates/src/internal/logs.js"

const platformTrustInfo = {
  status: "unknown",
  reason: "unsupported platform",
}

export const getCertificateTrustInfo = ({ logger }) => {
  logger.warn(`${warningSign} platform not supported, cannot get certificate trust info`)
  return {
    platform: platformTrustInfo,
  }
}

export const addCertificateToTrustStores = ({ logger }) => {
  logger.warn(`${warningSign} platform not supported, cannot add certificate to trust stores`)
  return {
    platform: platformTrustInfo,
  }
}

export const removeCertificateFromTrustStores = ({ logger }) => {
  logger.warn(`${warningSign} platform not supported, cannot remove certificate from trust stores`)
  return undefined
}
