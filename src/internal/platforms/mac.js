/*
 * see
 * - https://github.com/davewasmer/devcert/blob/master/src/platforms/darwin.ts
 * - https://www.unix.com/man-page/mojave/1/security/
 */

import { existsSync } from "node:fs"
import { createDetailedMessage } from "@jsenv/logger"
import { urlToFileSystemPath } from "@jsenv/filesystem"

import { exec } from "../exec.js"

export { ensureHostnamesRegistration } from "./shared.js"

export const ensureRootCertificateRegistration = async ({
  logger,
  rootCertificateFileUrl,
  rootCertificateSymlinkUrl,
  rootCertificateStatus,
  rootCertificatePEM,

  tryToTrustRootCertificate,
}) => {
  const isInMacOSKeychain = await detectRootCertificateInMacOSKeychain({
    logger,
    rootCertificatePEM,
  })

  if (!isInMacOSKeychain) {
    const addTrustedCertificateCommand = `sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain -p ssl -p basic "${urlToFileSystemPath(
      rootCertificateFileUrl,
    )}"`
    if (tryToTrustRootCertificate) {
      logger.info(`
Adding root certificate to macOS keychain
> ${addTrustedCertificateCommand}
`)
      try {
        await exec(addTrustedCertificateCommand)
      } catch (e) {
        logger.error(
          createDetailedMessage(`Failed to add root certificate to macOS keychain`, {
            "error stack": e.stack,
            "root certificate file url": rootCertificateFileUrl,
          }),
        )
      }
    } else {
      logger.info(`
${createDetailedMessage(`Root certificate must be added to macOS keychain`, {
  "root certificate file": urlToFileSystemPath(rootCertificateSymlinkUrl),
  "suggested documentation": `https://support.apple.com/guide/keychain-access/add-certificates-to-a-keychain-kyca2431/mac`,
  "suggested command": addTrustedCertificateCommand,
})}
`)
    }
  }

  const firefoxDetected = detectFirefox({ logger })
  if (firefoxDetected) {
    if (rootCertificateStatus === "reused") {
      logger.debug(`Root certificate reused, skip "how to trust for firefox" log`)
    } else {
      logger.info(`
${createDetailedMessage(`Root certificate needs to be trusted in Firefox`, {
  "root certificate file": urlToFileSystemPath(rootCertificateSymlinkUrl),
  "suggested documentation": "https://wiki.mozilla.org/PSM:Changing_Trust_Settings",
})}
`)
    }
  }
}

const detectRootCertificateInMacOSKeychain = async ({ logger, rootCertificatePEM }) => {
  const findAllCertificatesCommand = `security find-certificate -a -p`
  logger.debug(`
Searching root certificate in macOS keychain
> ${findAllCertificatesCommand}
`)
  const stringWithAllCertificatesAsPem = await exec(findAllCertificatesCommand)
  const rootCertificateInKeychain = stringWithAllCertificatesAsPem.includes(rootCertificatePEM)
  if (!rootCertificateInKeychain) {
    logger.debug(`Root certificate found in macOS keychain`)
    return false
  }

  logger.debug(`Root certificate is not in macOS keychain`)
  return true
}

const detectFirefox = ({ logger }) => {
  const firefoxAppFileExists = existsSync("/Applications/Firefox.app")
  if (!firefoxAppFileExists) {
    logger.debug(`Firefox not detected`)
    return false
  }

  logger.debug("Firefox detected")
  return true
}
