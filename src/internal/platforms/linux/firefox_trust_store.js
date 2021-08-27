// TODO

import { existsSync } from "node:fs"

export const getCertificateTrustInfoFromFirefox = ({ logger }) => {
  const firefoxDetected = detectFirefox({ logger })
  if (firefoxDetected) {
  }
}

const detectFirefox = ({ logger }) => {
  const firefoxBinFileExists = existsSync("/usr/bin/firefox")
  if (!firefoxBinFileExists) {
    logger.debug(`Firefox not detected`)
    return false
  }

  logger.debug("Firefox detected")
  return true
}
