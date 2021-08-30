const getCertificateTrustInfoFromEdge = ({ windowsTrustInfo }) => {
  return {
    status: windowsTrustInfo.status,
    reason: windowsTrustInfo.reason,
  }
}

const addCertificateInEdgeTrustStore = ({ windowsTrustInfo }) => {
  return {
    status: windowsTrustInfo.status,
    reason: windowsTrustInfo.reason,
  }
}

const removeCertificateFromEdgeTrustStore = ({ windowsTrustInfo }) => {
  return {
    status: windowsTrustInfo.status,
    reason: windowsTrustInfo.reason,
  }
}

export const edgeTrustStore = {
  getCertificateTrustInfo: getCertificateTrustInfoFromEdge,
  addCertificate: addCertificateInEdgeTrustStore,
  removeCertificate: removeCertificateFromEdgeTrustStore,
}
