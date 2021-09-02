import { existsSync } from "node:fs"
import { execSync } from "node:child_process"
import { resolveUrl, assertAndNormalizeDirectoryUrl } from "@jsenv/filesystem"

import { okSign, infoSign, warningSign } from "@jsenv/https-local/src/internal/logs.js"

import { executeTrustQueryOnBrowserNSSDB } from "../nssdb_browser.js"
import {
  nssCommandName,
  detectIfNSSIsInstalled,
  getCertutilBinPath,
  getNSSDynamicInstallInfo,
} from "./nss_mac.js"

export const executeTrustQueryOnFirefox = ({
  logger,
  certificateCommonName,
  certificateFileUrl,
  certificateIsNew,
  certificate,
  verb,
  NSSDynamicInstall,
}) => {
  return executeTrustQueryOnBrowserNSSDB({
    logger,
    certificateCommonName,
    certificateFileUrl,
    certificateIsNew,
    certificate,

    verb,
    NSSDynamicInstall,
    nssCommandName,
    detectIfNSSIsInstalled,
    getNSSDynamicInstallInfo,
    getCertutilBinPath,

    browserName: "firefox",
    detectBrowser: () => {
      logger.debug(`Detecting firefox...`)
      const firefoxDetected = existsSync("/Applications/Firefox.app")

      if (firefoxDetected) {
        logger.debug(`${okSign} firefox detected`)
        return true
      }

      logger.debug(`${infoSign} firefox not detected`)
      return false
    },
    browserNSSDBDirectoryUrl: resolveUrl(
      `./Library/Application Support/Firefox/Profiles/`,
      assertAndNormalizeDirectoryUrl(process.env.HOME),
    ),
    getBrowserClosedPromise: async () => {
      if (!isFirefoxOpen()) {
        return
      }

      logger.warn(`${warningSign} waiting for you to close firefox before resuming...`)
      const next = async () => {
        await new Promise((resolve) => setTimeout(resolve, 50))
        if (isFirefoxOpen()) {
          await next()
        } else {
          logger.info(`${okSign} firefox closed, resuming`)
          // wait 50ms more to ensure firefox has time to cleanup
          // othrwise sometimes there is an SEC_ERROR_REUSED_ISSUER_AND_SERIAL error
          // because we updated nss database file while firefox is not fully closed
          await new Promise((resolve) => setTimeout(resolve, 50))
        }
      }
      await next()
    },
  })
}

const isFirefoxOpen = () => {
  return execSync("ps aux").includes("firefox")
}
