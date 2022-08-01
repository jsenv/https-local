import { existsSync } from "node:fs"
import { execSync } from "node:child_process"
import { assertAndNormalizeDirectoryUrl } from "@jsenv/filesystem"
import { UNICODE, createTaskLog } from "@jsenv/log"

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
        logger.debug(`${UNICODE.OK} firefox detected`)
        return true
      }

      logger.debug(`${UNICODE.INFO} firefox not detected`)
      return false
    },
    browserNSSDBDirectoryUrl: new URL(
      `./Library/Application Support/Firefox/Profiles/`,
      assertAndNormalizeDirectoryUrl(process.env.HOME),
    ).href,
    getBrowserClosedPromise: async () => {
      if (!isFirefoxOpen()) {
        return
      }

      logger.warn(
        `${UNICODE.WARNING} firefox is running, it must be stopped before resuming...`,
      )
      const closeFirefoxTask = createTaskLog("waiting for firefox to close")
      const next = async () => {
        await new Promise((resolve) => setTimeout(resolve, 50))
        if (isFirefoxOpen()) {
          await next()
        } else {
          closeFirefoxTask.done()
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
  const psAux = execSync("ps aux")
  return psAux.includes("Firefox.app")
}
