import { getTrustInfoAboutMacOSKeychain } from "./getTrustInfoAboutMacOSKeychain.js"
import { getTrustInfoAboutFirefox } from "./getTrustInfoAboutFirefox.js"

export const getRootCertificateTrustInfo = async ({
  logger,
  rootCertificate,
  rootCertificateCommonName,
}) => {
  const mac = await getTrustInfoAboutMacOSKeychain({ logger })

  const firefox = await getTrustInfoAboutFirefox({ rootCertificate, rootCertificateCommonName })

  // chrome use OS trust store
  const chrome = { ...mac }

  // safari use OS trust store
  const safari = { ...mac }

  return {
    mac,
    firefox,
    chrome,
    safari,
  }
}
