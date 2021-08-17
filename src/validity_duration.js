const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000
const MILLISECONDS_PER_YEAR = MILLISECONDS_PER_DAY * 365

export const verifyRootCertificateValidityDuration = (rootCertificateValidityDurationInMs) => {
  const rootCertificateValidityDurationInYears =
    rootCertificateValidityDurationInMs / MILLISECONDS_PER_YEAR

  if (rootCertificateValidityDurationInYears > 25) {
    return {
      ok: false,
      maxAllowedValue: MILLISECONDS_PER_YEAR * 25,
      message: `root certificate validity duration of ${rootCertificateValidityDurationInYears} years is too much, using the max recommended duration: 25 years`,
      details:
        "https://serverfault.com/questions/847190/in-theory-could-a-ca-make-a-certificate-that-is-valid-for-arbitrarily-long",
    }
  }

  return { ok: true }
}

export const verifyServerCertificateValidityDuration = (serverCertificateValidityDurationInMs) => {
  const serverCertificateValidityDurationInDays =
    serverCertificateValidityDurationInMs / MILLISECONDS_PER_DAY

  if (serverCertificateValidityDurationInDays > 396) {
    return {
      ok: false,
      maxAllowedValue: MILLISECONDS_PER_DAY * 396,
      message: `certificate validity duration of ${serverCertificateValidityDurationInMs} days is too much, using the max recommended duration: 396 days`,
      details:
        "https://www.globalsign.com/en/blog/maximum-ssltls-certificate-validity-now-one-year",
    }
  }

  return { ok: true }
}

export const createValidityDurationOfXYears = (years) => MILLISECONDS_PER_YEAR * years

export const createValidityDurationOfXDays = (days) => MILLISECONDS_PER_DAY * days
