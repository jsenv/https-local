// TODO

import { existsSync } from "node:fs"

export const getCertificateTrustInfoFromChrome = ({ logger }) => {
  const chromeDetected = detectChrome({ logger })
  if (chromeDetected) {
  }
}

const detectChrome = ({ logger }) => {
  const chromeBinFileExists = existsSync("/usr/bin/google-chrome")
  if (!chromeBinFileExists) {
    logger.debug(`Chrome not detected`)
    return false
  }

  logger.debug("Chrome detected")
  return true
}
