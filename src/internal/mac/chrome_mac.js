import { existsSync } from "node:fs"

import { okSign, infoSign } from "@jsenv/local-https-certificates/src/internal/logs.js"
import { memoize } from "@jsenv/local-https-certificates/src/internal/memoize.js"

const REASON_CHROME_NOT_DETECTED = `Chrome not detected`

export const executeTrustQueryOnChrome = ({ logger, macTrustInfo }) => {
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
