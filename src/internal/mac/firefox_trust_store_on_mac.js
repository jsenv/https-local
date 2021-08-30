import { existsSync } from "node:fs"
import { execSync } from "node:child_process"
import { resolveUrl, assertAndNormalizeDirectoryUrl } from "@jsenv/filesystem"

import { memoize } from "@jsenv/local-https-certificates/src/internal/memoize.js"
import { okSign, infoSign, warningSign } from "@jsenv/local-https-certificates/src/internal/logs.js"
import { getNSSCommandInfo } from "./mac_utils.js"

import {
  getCertificateTrustInfoFromBrowserNSSDB,
  addCertificateInBrowserNSSDB,
  removeCertificateFromBrowserNSSDB,
} from "../nssdb_browser.js"

export const firefoxTrustStoreOnMac = {
  getCertificateTrustInfo: ({
    logger,
    certificate,
    certificateCommonName,
    newAndTryToTrustDisabled,
  }) => {
    return getCertificateTrustInfoFromBrowserNSSDB({
      logger,
      certificate,
      certificateCommonName,
      newAndTryToTrustDisabled,

      getBrowserInfo,
      getNSSCommandInfo,
    })
  },
  addCertificate: ({
    logger,
    certificateFileUrl,
    certificateCommonName,
    NSSDynamicInstall,
    existingTrustInfo,
  }) => {
    return addCertificateInBrowserNSSDB({
      logger,
      certificateFileUrl,
      certificateCommonName,
      NSSDynamicInstall,
      existingTrustInfo,

      getBrowserInfo,
      getNSSCommandInfo,
    })
  },
  removeCertificate: ({ logger, certificateCommonName, certificateFileUrl }) => {
    return removeCertificateFromBrowserNSSDB({
      logger,
      certificateCommonName,
      certificateFileUrl,

      getBrowserInfo,
      getNSSCommandInfo,
    })
  },
}

const getBrowserInfo = ({ logger }) => {
  const browserDetected = detectFirefox({ logger })

  const browserNSSDBDirectoryUrl = resolveUrl(
    `./Library/Application Support/Firefox/Profiles/`,
    assertAndNormalizeDirectoryUrl(process.env.HOME),
  )

  return {
    browserName: "firefox",
    browserDetected,
    browserNSSDBDirectoryUrl,
    getBrowserClosedPromise: () => getFirefoxClosedPromise({ logger }),
  }
}

const detectFirefox = memoize(({ logger }) => {
  logger.debug(`Detecting Firefox...`)
  const firefoxDetected = existsSync("/Applications/Firefox.app")

  if (firefoxDetected) {
    logger.debug(`${okSign} Firefox detected`)
    return true
  }

  logger.debug(`${infoSign} Firefox not detected`)
  return false
})

const getFirefoxClosedPromise = async ({ logger }) => {
  if (!isFirefoxOpen()) {
    return
  }

  logger.warn(`${warningSign} waiting for you to close Firefox before resuming...`)
  const next = async () => {
    await new Promise((resolve) => setTimeout(resolve, 50))
    if (isFirefoxOpen()) {
      await next()
    } else {
      logger.info(`${okSign} Firefox closed, resuming`)
      // wait 50ms more to ensure firefox has time to cleanup
      // othrwise sometimes there is an SEC_ERROR_REUSED_ISSUER_AND_SERIAL error
      // because we updated nss database file while firefox is not fully closed
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
  }
  await next()
}

const isFirefoxOpen = () => {
  return execSync("ps aux").includes("firefox")
}

// for test
// {
//   const { createLogger } = await import("@jsenv/logger")
//   const { getCertificateAuthorityFileUrls } = await import(
//     "../../certificate_authority_file_urls.js"
//   )
//   const { rootCertificateFileUrl } = getCertificateAuthorityFileUrls()
//   await removeCertificateFromFirefoxTrustStore({
//     logger: createLogger({ logLevel: "debug" }),
//     certificate: "",
//     certificateCommonName: "Jsenv localhost root certificate",
//     certificateFileUrl: rootCertificateFileUrl,
//   })
// }
