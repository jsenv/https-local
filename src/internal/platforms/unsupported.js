const platform = { status: "unknown", reason: "unsupported platform" }

const chrome = { status: "unknown", reason: "unsupported platform" }

const safari = { status: "unknown", reason: "unsupported platform" }

const firefox = { status: "unknown", reason: "unsupported platform" }

const trustInfo = {
  platform,
  chrome,
  safari,
  firefox,
}

export const getCertificateAuthorityTrustInfo = () => {
  return trustInfo
}

export const addCertificateAuthority = ({ logger }) => {
  logger.warn(`platform is not supported, cannot add certificate authority to OS and browsers`)
  return trustInfo
}

export const removeCertificateAuthority = ({ logger }) => {
  logger.warn(`platform is not supported, cannot remove certificate authority from OS and browsers`)
  return undefined
}
