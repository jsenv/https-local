/*
 *  Missing things that would be nice to have:
 * - A way to install and use NSS command on windows to update firefox NSS dabatase file
 */

import { createRequire } from "node:module"
import { existsSync } from "node:fs"

import { okSign, infoSign, warningSign } from "@jsenv/https-localhost/src/internal/logs.js"
import { memoize } from "@jsenv/https-localhost/src/internal/memoize.js"

const require = createRequire(import.meta.url)

const which = require("which")

const REASON_FIREFOX_NOT_DETECTED = "Firefox not detected"
const REASON_NOT_IMPLEMENTED_ON_WINDOWS = "not implemented on windows"

export const getCertificateTrustInfoFromFirefox = ({ logger }) => {
  const firefoxDetected = detectFirefox({ logger })
  if (!firefoxDetected) {
    return {
      status: "other",
      reason: REASON_FIREFOX_NOT_DETECTED,
    }
  }

  logger.info(
    `${infoSign} unable to detect if certificate is trusted by Firefox (${REASON_NOT_IMPLEMENTED_ON_WINDOWS})`,
  )
  return {
    status: "unknown",
    reason: REASON_NOT_IMPLEMENTED_ON_WINDOWS,
  }
}

export const addCertificateInFirefoxTrustStore = ([logger]) => {
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

export const removeCertificateFromFirefoxTrustStore = ({ logger }) => {
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

// https://github.com/litixsoft/karma-detect-browsers
const detectFirefox = memoize(({ logger }) => {
  logger.debug(`Detecting Firefox...`)

  const whichReturnValue = which.sync("FIREFOX_BIN")
  if (whichReturnValue) {
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
    if (which.sync(firefoxExecutablePathCandidate)) {
      return true
    }
    return false
  })
  if (someExecutableFound) {
    logger.debug(`${okSign} Firefox detected`)
    return true
  }

  logger.debug(`${infoSign} Firefox detected`)
  return false
})
