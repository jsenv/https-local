// TODO

import { existsSync } from "node:fs"

import { memoize } from "@jsenv/local-https-certificates/src/internal/memoize.js"

const getCertificateTrustInfoFromChrome = ({ logger }) => {
  const chromeDetected = detectChrome({ logger })
  if (chromeDetected) {
  }
}

export const chromeTrustStoreOnLinux = {
  getCertificateTrustInfo: getCertificateTrustInfoFromChrome,
}

const detectChrome = memoize(({ logger }) => {
  const chromeBinFileExists = existsSync("/usr/bin/google-chrome")
  if (!chromeBinFileExists) {
    logger.debug(`Chrome not detected`)
    return false
  }

  logger.debug("Chrome detected")
  return true
})
