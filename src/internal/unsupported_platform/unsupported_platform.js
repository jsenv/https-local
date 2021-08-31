import { warningSign } from "@jsenv/local-https-certificates/src/internal/logs.js"

const platformTrustInfo = {
  status: "unknown",
  reason: "unsupported platform",
}

export const executeTrustQuery = ({ logger }) => {
  logger.warn(`${warningSign} platform not supported, cannot execute trust query`)
  return {
    platform: platformTrustInfo,
  }
}
