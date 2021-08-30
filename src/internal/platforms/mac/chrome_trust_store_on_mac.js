import { existsSync } from "node:fs"

import { okSign, infoSign } from "@jsenv/https-localhost/src/internal/logs.js"
import { memoize } from "@jsenv/https-localhost/src/internal/memoize.js"

const REASON_CHROME_NOT_DETECTED = `Chrome not detected`

const getCertificateTrustInfoFromChrome = ({ logger, macTrustInfo }) => {
  const chromeDetected = detectChrome({ logger })
  if (!chromeDetected) {
    return {
      status: "other",
      reason: REASON_CHROME_NOT_DETECTED,
    }
  }

  return {
    status: macTrustInfo.status,
    reason: macTrustInfo.reason,
  }
}

const addCertificateInChromeTrustStore = ({ logger, macTrustInfo, existingTrustInfo }) => {
  if (existingTrustInfo && existingTrustInfo.chrome.status === "other") {
    return existingTrustInfo.chrome
  }

  const chromeDetected = detectChrome({ logger })
  if (!chromeDetected) {
    return {
      status: "other",
      reason: REASON_CHROME_NOT_DETECTED,
    }
  }

  return {
    status: macTrustInfo.status,
    reason: macTrustInfo.reason,
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
    reason: macTrustInfo.reason,
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
