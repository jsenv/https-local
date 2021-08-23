/*
 * see
 * - https://github.com/davewasmer/devcert/blob/master/src/platforms/darwin.ts
 * - https://www.unix.com/man-page/mojave/1/security/
 */

import { getTrustInfoAboutMacKeychain } from "./mac/getTrustInfoAboutMacKeychain.js"
import { getTrustInfoAboutFirefox } from "./mac/getTrustInfoAboutFirefox.js"
import { addCertificateAuthorityInMacKeychain } from "./mac/addCertificateAuthorityInMacKeychain.js"
import { addCertificateAuthorityInFirefox } from "./mac/addCertificateAuthorityInFirefox.js"
import { removeCertificateAuthorityFromMacKeychain } from "./mac/removeCertificateAuthorityFromMacKeychain.js"
import { removeCertificateAuthorityFromFirefox } from "./mac/removeCertificateAuthorityFromFirefox.js"

export const getCertificateAuthorityTrustInfo = async ({
  logger,
  rootCertificate,
  rootCertificateCommonName,
}) => {
  const mac = await getTrustInfoAboutMacKeychain({
    logger,
  })

  // chrome use OS trust store
  const chrome = { ...mac }

  // safari use OS trust store
  const safari = { ...mac }

  const firefox = await getTrustInfoAboutFirefox({
    logger,
    rootCertificate,
    rootCertificateCommonName,
  })

  return {
    mac,
    firefox,
    chrome,
    safari,
  }
}

export const addCertificateAuthority = async ({
  logger,
  rootCertificate,
  rootCertificateFileUrl,
  rootCertificateCommonName,
  mac,
  firefox,
  NSSDynamicInstall = true,
}) => {
  const trustInfo = {}

  if (mac) {
    const macTrustInfo = await addCertificateAuthorityInMacKeychain({
      logger,
      rootCertificate,
      rootCertificateFileUrl,
    })
    trustInfo.mac = macTrustInfo
    // chrome use OS trust store
    trustInfo.chrome = { ...macTrustInfo }
    // safari use OS trust store
    trustInfo.safari = { ...macTrustInfo }
  }
  if (firefox) {
    trustInfo.firefox = await addCertificateAuthorityInFirefox({
      logger,
      rootCertificateFileUrl,
      rootCertificate,
      rootCertificateCommonName,
      NSSDynamicInstall,
    })
  }

  return trustInfo
}

export const removeCertificateAuthority = async ({
  logger,
  rootCertificate,
  rootCertificateFileUrl,
  rootCertificateCommonName,
}) => {
  await removeCertificateAuthorityFromMacKeychain({
    logger,
    rootCertificate,
    rootCertificateFileUrl,
  })

  // no need for chrome and safari, they are handled by mac keychain

  await removeCertificateAuthorityFromFirefox({
    logger,
    rootCertificate,
    rootCertificateCommonName,
  })
}
