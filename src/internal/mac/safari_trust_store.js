const getCertificateTrustInfoFromSafari = ({ macTrustInfo }) => {
  return {
    status: macTrustInfo.status,
    reason: macTrustInfo.reason,
  }
}

const addCertificateInSafariTrustStore = ({ macTrustInfo }) => {
  return {
    status: macTrustInfo.status,
    reason: macTrustInfo.reason,
  }
}

const removeCertificateFromSafariTrustStore = ({ macTrustInfo }) => {
  return {
    status: macTrustInfo.status,
    reason: macTrustInfo.reason,
  }
}

export const safariTrustStore = {
  getCertificateTrustInfo: getCertificateTrustInfoFromSafari,
  addCertificate: addCertificateInSafariTrustStore,
  removeCertificate: removeCertificateFromSafariTrustStore,
}
