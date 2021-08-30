import { createRequire } from "node:module"
import { existsSync } from "node:fs"

import { okSign, infoSign } from "@jsenv/local-https-certificates/src/internal/logs.js"
import { memoize } from "@jsenv/local-https-certificates/src/internal/memoize.js"

const require = createRequire(import.meta.url)

const which = require("which")

const REASON_CHROME_NOT_DETECTED = `Chrome not detected`

const getCertificateTrustInfoFromChrome = ({ logger, windowsTrustInfo }) => {
  const chromeDetected = detectChrome({ logger })
  if (!chromeDetected) {
    return {
      status: "other",
      reason: REASON_CHROME_NOT_DETECTED,
    }
  }

  return {
    status: windowsTrustInfo.status,
    reason: windowsTrustInfo.reason,
  }
}

const addCertificateInChromeTrustStore = ({ logger, windowsTrustInfo, existingTrustInfo }) => {
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
    status: windowsTrustInfo.status,
    reason: windowsTrustInfo.reason,
  }
}

const removeCertificateFromChromeTrustStore = ({ logger, windowsTrustInfo }) => {
  const chromeDetected = detectChrome({ logger })
  if (!chromeDetected) {
    return {
      status: "other",
      reason: REASON_CHROME_NOT_DETECTED,
    }
  }

  return {
    status: windowsTrustInfo.status,
    reason: windowsTrustInfo.reason,
  }
}

export const chromeTrustStoreOnWindows = {
  getCertificateTrustInfo: getCertificateTrustInfoFromChrome,
  addCertificate: addCertificateInChromeTrustStore,
  removeCertificate: removeCertificateFromChromeTrustStore,
}

// https://github.com/litixsoft/karma-detect-browsers/blob/332b4bdb2ab3db7c6a1a6d3ec5a1c6ccf2332c4d/browsers/Chrome.js#L1
const detectChrome = memoize(({ logger }) => {
  logger.debug(`Detecting Chrome...`)

  const whichReturnValue = which.sync("FIREFOX_BIN")
  if (whichReturnValue) {
    logger.debug(`${okSign} Firefox detected`)
    return true
  }

  const executableCandidates = [
    `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env.ProgramW6432}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env.ProgramFiles}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env["ProgramFiles(x86)"]}\\Google\\Chrome\\Application\\chrome.exe`,
  ]
  const someExecutableFound = executableCandidates.some((firefoxExecutablePathCandidate) => {
    if (existsSync(firefoxExecutablePathCandidate)) {
      return true
    }
    if (which.sync(firefoxExecutablePathCandidate)) {
      return true
    }
    return false
  })
  if (someExecutableFound) {
    logger.debug(`${okSign} Chrome detected`)
    return true
  }

  logger.debug(`${infoSign} Chrome detected`)
  return false
})
