/*
 * see
 * - https://github.com/davewasmer/devcert/blob/master/src/platforms/darwin.ts
 * - https://www.unix.com/man-page/mojave/1/security/
 */

import { infoSign, okSign } from "@jsenv/https-localhost/src/internal/logs.js"

import { detectFirefox } from "./mac/mac_utils.js"
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
  logger.info(`Check if certificate is trusted in mac OS...`)
  const mac = await getTrustInfoAboutMacKeychain({
    logger,
  })
  if (mac.status === "trusted") {
    logger.info(`${okSign} certificate trusted by mac OS`)
  } else {
    logger.info(`${infoSign} certificate not trusted by mac OS`)
  }

  // chrome use OS trust store
  const chrome = { ...mac }

  // safari use OS trust store
  const safari = { ...mac }

  let firefox
  const firefoxDetected = detectFirefox({ logger })
  if (firefoxDetected) {
    logger.info(`Check if certificate is trusted in Firefox...`)
    firefox = await getTrustInfoAboutFirefox({
      logger,
      rootCertificate,
      rootCertificateCommonName,
    })
    if (firefox.status === "trusted") {
      logger.info(`${okSign} certificate trusted by Firefox`)
    } else if (firefox.status === "not_trusted") {
      logger.info(`${infoSign} certificate not trusted by mac OS`)
    } else {
      logger.info(`${infoSign} unable to detect if certificate is trusted by Firefox`)
    }
  } else {
    firefox = {
      status: "other",
      reason: "Firefox not detected",
    }
  }

  return {
    mac,
    chrome,
    safari,
    firefox,
  }
}

export const addCertificateAuthority = async ({
  logger,
  rootCertificate,
  rootCertificateFileUrl,
  rootCertificateCommonName,
  existingCertificateAuthorityInfo,
  NSSDynamicInstall = true,
}) => {
  const trustInfo = {}

  const needsToBeAddedToKeyChain =
    !existingCertificateAuthorityInfo ||
    existingCertificateAuthorityInfo.trustInfo.mac.status === "not_trusted"

  if (needsToBeAddedToKeyChain) {
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

  const needsToBeAddedToFirefox =
    !existingCertificateAuthorityInfo ||
    existingCertificateAuthorityInfo.trustInfo.firefox.status === "not_trusted"

  if (needsToBeAddedToFirefox) {
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
