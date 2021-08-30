// TODO

import { existsSync } from "node:fs"

import { memoize } from "@jsenv/https-localhost/src/internal/memoize.js"

export const getCertificateTrustInfoFromFirefox = ({ logger }) => {
  const firefoxDetected = detectFirefox({ logger })
  if (firefoxDetected) {
  }
}

export const firefoxTrustStoreOnLinux = {
  getCertificateTrustInfo: getCertificateTrustInfoFromFirefox,
}

const detectFirefox = memoize(({ logger }) => {
  const firefoxBinFileExists = existsSync("/usr/bin/firefox")
  if (!firefoxBinFileExists) {
    logger.debug(`Firefox not detected`)
    return false
  }

  logger.debug("Firefox detected")
  return true
})
