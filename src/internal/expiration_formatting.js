import { createRequire } from "node:module"

const require = createRequire(import.meta.url)

export const formatExpiredSinceDuration = (duration) => {
  const humanizeDuration = require("humanize-duration")

  return humanizeDuration(duration, { largest: 2, maxDecimalPoints: 2 })
}

export const formatExpiresInDuration = (duration) => {
  const humanizeDuration = require("humanize-duration")

  return humanizeDuration(duration, { largest: 2, maxDecimalPoints: 2 })
}
