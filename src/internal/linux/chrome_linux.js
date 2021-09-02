import { existsSync } from "node:fs"
import { execSync } from "node:child_process"
import { resolveUrl, assertAndNormalizeDirectoryUrl } from "@jsenv/filesystem"

import { okSign, infoSign, warningSign } from "@jsenv/https-local/src/internal/logs.js"
import {
  nssCommandName,
  detectIfNSSIsInstalled,
  getNSSDynamicInstallInfo,
  getCertutilBinPath,
} from "./nss_linux.js"

import { executeTrustQueryOnBrowserNSSDB } from "../nssdb_browser.js"

export const executeTrustQueryOnChrome = ({
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

    browserName: "chrome",
    detectBrowser: () => {
      logger.debug(`Detecting Chrome...`)
      const chromeBinFileExists = existsSync("/usr/bin/google-chrome")

      if (chromeBinFileExists) {
        logger.debug(`${okSign} Chrome detected`)
        return true
      }

      logger.debug(`${infoSign} Chrome not detected`)
      return false
    },
    browserNSSDBDirectoryUrl: resolveUrl(
      ".pki/nssdb",
      assertAndNormalizeDirectoryUrl(process.env.HOME),
    ),
    getBrowserClosedPromise: async () => {
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
    },
  })
}

const isChromeOpen = () => {
  return execSync("ps aux").includes("google chrome")
}
