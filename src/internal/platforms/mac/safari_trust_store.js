import { okSign, infoSign } from "@jsenv/https-localhost/src/internal/logs.js"

const REASON_SAFARI_USES_MAC_KEYCHAIN = `Safari uses mac keychain`

const getCertificateTrustInfoFromSafari = ({ logger, macTrustInfo }) => {
  if (macTrustInfo.status === "trusted") {
    logger.info(`${okSign} certificate is trusted by Safari...`)
  } else {
    logger.info(`${infoSign} certificate not trusted by Safari`)
  }
  return {
    status: macTrustInfo.status,
    reason: REASON_SAFARI_USES_MAC_KEYCHAIN,
  }
}

const addCertificateInSafariTrustStore = ({ macTrustInfo }) => {
  return {
    status: macTrustInfo.status,
    reason: REASON_SAFARI_USES_MAC_KEYCHAIN,
  }
}

const removeCertificateFromSafariTrustStore = ({ macTrustInfo }) => {
  return {
    status: macTrustInfo.status,
    reason: REASON_SAFARI_USES_MAC_KEYCHAIN,
  }
}

export const safariTrustStore = {
  getCertificateTrustInfo: getCertificateTrustInfoFromSafari,
  addCertificate: addCertificateInSafariTrustStore,
  removeCertificate: removeCertificateFromSafariTrustStore,
}
