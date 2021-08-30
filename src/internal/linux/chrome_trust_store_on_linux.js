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

export const chromeTrustStoreOnLinux = {
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

      browserName: chromeBrowserName,
      detectBrowser: detectChrome,
      browserNSSDBDirectoryUrl: chromeNSSDBDirectoryUrl,

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

      browserName: chromeBrowserName,
      detectBrowser: detectChrome,
      browserNSSDBDirectoryUrl: chromeNSSDBDirectoryUrl,
      getBrowserClosedPromise: () => getChromeClosedPromise({ logger }),

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

      browserName: chromeBrowserName,
      detectBrowser: detectChrome,
      browserNSSDBDirectoryUrl: chromeNSSDBDirectoryUrl,
      getBrowserClosedPromise: () => getChromeClosedPromise({ logger }),

      nssCommandName,
      detectIfNSSIsInstalled,
      getCertutilBinPath,
    })
  },
}

const chromeBrowserName = "chrome"

const chromeNSSDBDirectoryUrl = resolveUrl(
  ".pki/nssdb",
  assertAndNormalizeDirectoryUrl(process.env.HOME),
)

const detectChrome = memoize(({ logger }) => {
  logger.debug(`Detecting Chrome...`)
  const chromeBinFileExists = existsSync("/usr/bin/google-chrome")

  if (chromeBinFileExists) {
    logger.debug(`${okSign} Chrome detected`)
    return true
  }

  logger.debug(`${infoSign} Chrome not detected`)
  return false
})

const getChromeClosedPromise = async ({ logger }) => {
  if (!isChromeOpen()) {
    return
  }

  logger.warn(`${warningSign} waiting for you to close Chrome before resuming...`)
  const next = async () => {
    await new Promise((resolve) => setTimeout(resolve, 50))
    if (isChromeOpen()) {
      await next()
    } else {
      logger.info(`${okSign} Chrome closed, resuming`)
      // wait 50ms more to ensure chrome has time to cleanup
      // othrwise sometimes there is an SEC_ERROR_REUSED_ISSUER_AND_SERIAL error
      // because we updated nss database file while chrome is not fully closed
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
  }
  await next()
}

const isChromeOpen = () => {
  return execSync("ps aux").includes("google chrome")
}
