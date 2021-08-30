/*
 *  Missing things that would be nice to have:
 * - A way to install and use NSS command on windows to update firefox NSS dabatase file
 */

import { createRequire } from "node:module"
import { existsSync } from "node:fs"

import { okSign, infoSign, warningSign } from "@jsenv/local-https-certificates/src/internal/logs.js"
import { memoize } from "@jsenv/local-https-certificates/src/internal/memoize.js"

const require = createRequire(import.meta.url)

const which = require("which")

const REASON_FIREFOX_NOT_DETECTED = "Firefox not detected"
const REASON_NOT_IMPLEMENTED_ON_WINDOWS = "not implemented on windows"

const getCertificateTrustInfoFromFirefox = ({ logger, newAndTryToTrustDisabled }) => {
  const firefoxDetected = detectFirefox({ logger })
  if (!firefoxDetected) {
    return {
      status: "other",
      reason: REASON_FIREFOX_NOT_DETECTED,
    }
  }

  if (newAndTryToTrustDisabled) {
    logger.info(`${infoSign} You should add certificate to firefox`)
    return {
      status: "not_trusted",
      reason: "certificate is new and tryToTrust is disabled",
    }
  }

  logger.info(`Check if certificate is trusted by firefox...`)
  logger.info(
    `${infoSign} unable to detect if certificate is trusted by firefox (${REASON_NOT_IMPLEMENTED_ON_WINDOWS})`,
  )
  return {
    status: "unknown",
    reason: REASON_NOT_IMPLEMENTED_ON_WINDOWS,
  }
}

const addCertificateInFirefoxTrustStore = ({ logger, existingTrustInfo }) => {
  if (existingTrustInfo && existingTrustInfo.firefox.status === "other") {
    return existingTrustInfo.firefox
  }
  if (existingTrustInfo && existingTrustInfo.firefox.status === "unknown") {
    return existingTrustInfo.firefox
  }

  const firefoxDetected = detectFirefox({ logger })
  if (!firefoxDetected) {
    return {
      status: "other",
      reason: REASON_FIREFOX_NOT_DETECTED,
    }
  }

  logger.warn(
    `${warningSign} cannot add certificate to firefox (${REASON_NOT_IMPLEMENTED_ON_WINDOWS})`,
  )
  return {
    status: "unknown",
    reason: REASON_NOT_IMPLEMENTED_ON_WINDOWS,
  }
}

const removeCertificateFromFirefoxTrustStore = ({ logger }) => {
  const firefoxDetected = detectFirefox({ logger })
  if (!firefoxDetected) {
    return {
      status: "other",
      reason: REASON_FIREFOX_NOT_DETECTED,
    }
  }

  logger.warn(
    `${warningSign} cannot remove certificate from firefox (${REASON_NOT_IMPLEMENTED_ON_WINDOWS})`,
  )
  return {
    status: "unknown",
    reason: REASON_NOT_IMPLEMENTED_ON_WINDOWS,
  }
}

export const firefoxTrustStoreOnWindows = {
  getCertificateTrustInfo: getCertificateTrustInfoFromFirefox,
  addCertificate: addCertificateInFirefoxTrustStore,
  removeCertificate: removeCertificateFromFirefoxTrustStore,
}

// https://github.com/litixsoft/karma-detect-browsers
const detectFirefox = memoize(({ logger }) => {
  logger.debug(`Detecting Firefox...`)

  if (process.env.FIREFOX_BIN && which.sync(process.env.FIREFOX_BIN)) {
    logger.debug(`${okSign} Firefox detected`)
    return true
  }

  const executableCandidates = [
    `${process.env.LOCALAPPDATA}\\Mozilla Firefox\\firefox.exe`,
    `${process.env.ProgramW6432}\\Mozilla Firefox\\firefox.exe`,
    `${process.env.ProgramFiles}\\Mozilla Firefox\\firefox.exe`,
    `${process.env["ProgramFiles(x86)"]}\\Mozilla Firefox\\firefox.exe`,
  ]
  const someExecutableFound = executableCandidates.some((firefoxExecutablePathCandidate) => {
    if (existsSync(firefoxExecutablePathCandidate)) {
      return true
    }
    try {
      which.sync(firefoxExecutablePathCandidate)
      return true
    } catch (e) {}
    return false
  })
  if (someExecutableFound) {
    logger.debug(`${okSign} Firefox detected`)
    return true
  }

  logger.debug(`${infoSign} Firefox detected`)
  return false
})
