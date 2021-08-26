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
  const macTrustInfo = await getMacTrustInfo({
    logger,
  })

  // chrome use OS trust store
  const chromeTrustInfo = { ...macTrustInfo }

  // safari use OS trust store
  const safariTrustInfo = { ...macTrustInfo }

  const firefoxTrustInfo = await getFirefoxTrustInfo({
    logger,
    rootCertificate,
    rootCertificateCommonName,
  })

  return {
    mac: macTrustInfo,
    chrome: chromeTrustInfo,
    safari: safariTrustInfo,
    firefox: firefoxTrustInfo,
  }
}

const getMacTrustInfo = async ({ logger }) => {
  logger.info(`Check if certificate is trusted in mac OS...`)
  const macTrustInfo = await getTrustInfoAboutMacKeychain({
    logger,
  })
  if (macTrustInfo.status === "trusted") {
    logger.info(`${okSign} certificate trusted by mac OS`)
  } else {
    logger.info(`${infoSign} certificate not trusted by mac OS`)
  }
  return macTrustInfo
}

const getFirefoxTrustInfo = async ({ logger, rootCertificate, rootCertificateCommonName }) => {
  const firefoxDetected = detectFirefox({ logger })
  if (!firefoxDetected) {
    return {
      status: "other",
      reason: "Firefox not detected",
    }
  }

  logger.info(`Check if certificate is trusted in Firefox...`)
  const firefoxTrustInfo = await getTrustInfoAboutFirefox({
    logger,
    rootCertificate,
    rootCertificateCommonName,
  })
  if (firefoxTrustInfo.status === "trusted") {
    logger.info(`${okSign} certificate trusted by Firefox`)
  } else if (firefoxTrustInfo.status === "not_trusted") {
    logger.info(`${infoSign} certificate not trusted by Firefox`)
  } else {
    logger.info(
      `${infoSign} unable to detect if certificate is trusted by Firefox (${firefoxTrustInfo.reason})`,
    )
  }
  return firefoxTrustInfo
}

export const addCertificateAuthority = async ({
  logger,
  rootCertificate,
  rootCertificateFileUrl,
  rootCertificateCommonName,
  existingTrustInfo,
  tryToTrust = false,
  NSSDynamicInstall = true,
}) => {
  const macTrustInfo = await getMacTrustInfoTryingToTrust({
    logger,
    tryToTrust,
    existingMacTrustInfo: existingTrustInfo ? existingTrustInfo.mac : null,
    rootCertificate,
    rootCertificateFileUrl,
  })

  // chrome use OS trust store
  const chromeTrustInfo = { ...macTrustInfo }

  // safari use OS trust store
  const safariTrustInfo = { ...macTrustInfo }

  const firefoxTrustInfo = await getFirefoxTrustInfoTryingToTrust({
    logger,
    tryToTrust,
    existingFirefoxTrustInfo: existingTrustInfo ? existingTrustInfo.firefox : null,
    rootCertificate,
    rootCertificateFileUrl,
    rootCertificateCommonName,
    NSSDynamicInstall,
  })

  return {
    mac: macTrustInfo,
    chrome: chromeTrustInfo,
    safari: safariTrustInfo,
    firefox: firefoxTrustInfo,
  }
}

const getMacTrustInfoTryingToTrust = async ({
  logger,
  tryToTrust,
  existingMacTrustInfo,
  rootCertificate,
  rootCertificateFileUrl,
}) => {
  if (!existingMacTrustInfo) {
    if (tryToTrust) {
      return await addCertificateAuthorityInMacKeychain({
        logger,
        rootCertificate,
        rootCertificateFileUrl,
      })
    }
    return {
      status: "not_trusted",
      reason: "tryToTrust disabled",
    }
  }

  if (existingMacTrustInfo.status === "not_trusted") {
    if (tryToTrust) {
      return await addCertificateAuthorityInMacKeychain({
        logger,
        rootCertificate,
        rootCertificateFileUrl,
      })
    }
    return {
      status: existingMacTrustInfo.status,
      reason: `${existingMacTrustInfo.reason} and tryToTrust disabled`,
    }
  }

  return existingMacTrustInfo
}

const getFirefoxTrustInfoTryingToTrust = async ({
  logger,
  tryToTrust,
  existingFirefoxTrustInfo,
  rootCertificate,
  rootCertificateFileUrl,
  rootCertificateCommonName,
  NSSDynamicInstall,
}) => {
  if (!existingFirefoxTrustInfo) {
    const firefoxDetected = detectFirefox({ logger })
    if (!firefoxDetected) {
      return {
        status: "other",
        reason: "Firefox not detected",
      }
    }

    if (tryToTrust) {
      return await addCertificateAuthorityInFirefox({
        logger,
        rootCertificate,
        rootCertificateFileUrl,
        rootCertificateCommonName,
        NSSDynamicInstall,
      })
    }
    return {
      status: "not_trusted",
      reason: "tryToTrust disabled",
    }
  }

  if (existingFirefoxTrustInfo.status === "not_trusted") {
    if (tryToTrust) {
      return await addCertificateAuthorityInFirefox({
        logger,
        rootCertificate,
        rootCertificateFileUrl,
        rootCertificateCommonName,
        NSSDynamicInstall,
      })
    }
    return {
      status: existingFirefoxTrustInfo.status,
      reason: `${existingFirefoxTrustInfo.reason} and tryToTrust disabled`,
    }
  }

  return existingFirefoxTrustInfo
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
