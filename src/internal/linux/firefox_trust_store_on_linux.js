import { existsSync } from "node:fs"
import { execSync } from "node:child_process"
import { resolveUrl, assertAndNormalizeDirectoryUrl } from "@jsenv/filesystem"

import { memoize } from "@jsenv/local-https-certificates/src/internal/memoize.js"
import { okSign, infoSign, warningSign } from "@jsenv/local-https-certificates/src/internal/logs.js"
import {
  nssCommandName,
  detectIfNSSIsInstalled,
  getNSSDynamicInstallInfo,
  getCertutilBinPath,
} from "./nss_info_on_linux.js"

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

      browserName: firefoxBrowserName,
      detectBrowser: detectFirefox,
      browserNSSDBDirectoryUrl: firefoxNSSDBDirectoryUrl,

      nssCommandName,
      detectIfNSSIsInstalled,
      getCertutilBinPath,
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

      browserName: firefoxBrowserName,
      detectBrowser: detectFirefox,
      browserNSSDBDirectoryUrl: firefoxNSSDBDirectoryUrl,
      getBrowserClosedPromise: () => getFirefoxClosedPromise({ logger }),

      nssCommandName,
      detectIfNSSIsInstalled,
      getNSSDynamicInstallInfo,
      getCertutilBinPath,
    })
  },
  removeCertificate: ({ logger, certificateCommonName, certificateFileUrl }) => {
    return removeCertificateFromBrowserNSSDB({
      logger,
      certificateCommonName,
      certificateFileUrl,

      browserName: firefoxBrowserName,
      detectBrowser: detectFirefox,
      browserNSSDBDirectoryUrl: firefoxNSSDBDirectoryUrl,
      getBrowserClosedPromise: () => getFirefoxClosedPromise({ logger }),

      nssCommandName,
      detectIfNSSIsInstalled,
      getCertutilBinPath,
    })
  },
}

const firefoxBrowserName = "firefox"

const firefoxNSSDBDirectoryUrl = resolveUrl(
  ".mozilla/firefox/*",
  assertAndNormalizeDirectoryUrl(process.env.HOME),
)

const detectFirefox = memoize(({ logger }) => {
  logger.debug(`Detecting Firefox...`)
  const firefoxBinFileExists = existsSync("/usr/bin/firefox")

  if (firefoxBinFileExists) {
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
