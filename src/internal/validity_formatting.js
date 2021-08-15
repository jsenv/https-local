export const formatExpired = ({ msEllapsedSinceExpiration, msEllapsedSinceValid }) => {
  return `root certificate has expired ${formatTimeDelta(
    -msEllapsedSinceExpiration,
  )}, it was valid during ${formatDuration(msEllapsedSinceValid)}`
}

export const formatAboutToExpire = ({ validityRemainingMs, msEllapsedSinceValid }) => {
  return `root certificate is about to expire ${formatTimeDelta(
    validityRemainingMs,
  )}, it was valid during ${formatDuration(msEllapsedSinceValid)}`
}

const formatTimeDelta = (deltaInMs) => {
  const unit = pickUnit(Math.abs(deltaInMs))
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" })
  const msRounded = Math.floor(deltaInMs / unit.min)
  return rtf.format(msRounded, unit.name)
}

const formatDuration = (ms) => {
  const unit = pickUnit(ms)
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" })
  const msRounded = Math.floor(ms / unit.min)
  const parts = rtf.formatToParts(msRounded, unit.name)
  if (parts.length > 1 && parts[0].type === "literal") {
    return parts.slice(1).join("")
  }
  return parts.join("")
}

const pickUnit = (ms) => {
  const msPerSecond = 1000
  const msPerMinute = msPerSecond * 60
  const msPerHour = msPerMinute * 60
  const msPerDay = msPerHour * 24
  const msPerMonth = msPerDay * 30
  const msPerYear = msPerDay * 365

  if (ms < msPerMinute) {
    return {
      name: "second",
      // min 0 to allow display of 0.01 second for example
      min: 0,
    }
  }
  if (ms < msPerHour) {
    return { name: "minute", min: msPerMinute }
  }
  if (ms < msPerDay) {
    return { name: "hour", min: msPerHour }
  }
  if (ms < msPerMonth) {
    return { name: "day", min: msPerDay }
  }
  if (ms < msPerYear) {
    return { name: "month", min: msPerMonth }
  }
  return { name: "year", min: msPerYear }
}
