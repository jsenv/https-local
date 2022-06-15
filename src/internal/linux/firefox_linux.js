import { existsSync } from "node:fs"
import { execSync } from "node:child_process"
import { assertAndNormalizeDirectoryUrl } from "@jsenv/filesystem"
import { UNICODE } from "@jsenv/log"

import {
  nssCommandName,
  detectIfNSSIsInstalled,
  getNSSDynamicInstallInfo,
  getCertutilBinPath,
} from "./nss_linux.js"

import { executeTrustQueryOnBrowserNSSDB } from "../nssdb_browser.js"

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
      logger.debug(`Detecting Firefox...`)
      const firefoxBinFileExists = existsSync("/usr/bin/firefox")

      if (firefoxBinFileExists) {
        logger.debug(`${UNICODE.OK} Firefox detected`)
        return true
      }

      logger.debug(`${UNICODE.INFO} Firefox not detected`)
      return false
    },
    browserNSSDBDirectoryUrl: new URL(
      ".mozilla/firefox/",
      assertAndNormalizeDirectoryUrl(process.env.HOME),
    ).href,
    getBrowserClosedPromise: async () => {
      if (!isFirefoxOpen()) {
        return
      }

      logger.warn(
        `${UNICODE.WARNING} waiting for you to close Firefox before resuming...`,
      )
      const next = async () => {
        await new Promise((resolve) => setTimeout(resolve, 50))
        if (isFirefoxOpen()) {
          await next()
        } else {
          logger.info(`${UNICODE.OK} Firefox closed, resuming`)
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
