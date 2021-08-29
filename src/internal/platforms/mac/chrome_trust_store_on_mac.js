import { existsSync } from "node:fs"

import { okSign, infoSign } from "@jsenv/https-localhost/src/internal/logs.js"
import { memoize } from "@jsenv/https-localhost/src/internal/memoize.js"

const REASON_CHROME_NOT_DETECTED = `Chrome not detected`
const REASON_CHROME_USES_MAC_KEYCHAIN = `Chrome uses mac keychain`

const getCertificateTrustInfoFromChrome = ({ logger, macTrustInfo }) => {
  const chromeDetected = detectChrome({ logger })
  if (!chromeDetected) {
    return {
      status: "other",
      reason: REASON_CHROME_NOT_DETECTED,
    }
  }

  if (macTrustInfo.status === "trusted") {
    logger.info(`${okSign} certificate is trusted by Chrome...`)
  } else {
    logger.info(`${infoSign} certificate not trusted by Chrome`)
  }
  return {
    status: macTrustInfo.status,
    reason: REASON_CHROME_USES_MAC_KEYCHAIN,
  }
}

const addCertificateInChromeTrustStore = ({ logger, macTrustInfo }) => {
  const chromeDetected = detectChrome({ logger })
  if (!chromeDetected) {
    return {
      status: "other",
      reason: REASON_CHROME_NOT_DETECTED,
    }
  }

  return {
    status: macTrustInfo.status,
    reason: REASON_CHROME_USES_MAC_KEYCHAIN,
  }
}

const removeCertificateFromChromeTrustStore = ({ logger, macTrustInfo }) => {
  const chromeDetected = detectChrome({ logger })
  if (!chromeDetected) {
    return {
      status: "other",
      reason: REASON_CHROME_NOT_DETECTED,
    }
  }

  return {
    status: macTrustInfo.status,
    reason: REASON_CHROME_USES_MAC_KEYCHAIN,
  }
}

export const chromeTrustStoreOnMac = {
  getCertificateTrustInfo: getCertificateTrustInfoFromChrome,
  addCertificate: addCertificateInChromeTrustStore,
  removeCertificate: removeCertificateFromChromeTrustStore,
}

const detectChrome = memoize(({ logger }) => {
  logger.debug(`Detecting Chrome...`)
  const chromeDetected = existsSync("/Applications/Google Chrome.app")

  if (chromeDetected) {
    logger.debug(`${okSign} Chrome detected`)
    return true
  }

  logger.debug(`${infoSign} Chrome not detected`)
  return false
})
