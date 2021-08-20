/*
 * see https://github.com/davewasmer/devcert/blob/master/src/platforms/linux.ts
 */

import { existsSync } from "node:fs"
import { createDetailedMessage } from "@jsenv/logger"
import { readFile, urlToFileSystemPath } from "@jsenv/filesystem"

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
  const isInLinuxTrustStore = await detectRootCertificateInLinuxTrustStore({
    logger,
    rootCertificatePEM,
  })

  if (!isInLinuxTrustStore) {
    const copyRootCertificateCommand = `sudo cp "${urlToFileSystemPath(
      rootCertificateFileUrl,
    )}" /usr/local/share/ca-certificates/jsenv_certificate_authority.crt`
    const updateCertificateAuthoritiesCommand = `sudo update-ca-certificates`

    if (tryToTrustRootCertificate) {
      logger.info(`
Adding root certificate to linux trust store
> ${copyRootCertificateCommand}
> ${updateCertificateAuthoritiesCommand}
`)
      try {
        await exec(copyRootCertificateCommand)
        await exec(updateCertificateAuthoritiesCommand)
      } catch (e) {
        logger.error(
          createDetailedMessage(`Failed to add root certificate to linux trust store`, {
            "error stack": e.stack,
            "root certificate file url": rootCertificateFileUrl,
          }),
        )
      }
    } else {
      logger.info(`
${createDetailedMessage(`Root certificate must be added to linux trust store`, {
  "root certificate file": urlToFileSystemPath(rootCertificateSymlinkUrl),
  "suggested documentation": `https://support.apple.com/guide/keychain-access/add-certificates-to-a-keychain-kyca2431/mac`,
  "suggested command": `> ${copyRootCertificateCommand}
> ${updateCertificateAuthoritiesCommand}`,
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

const detectRootCertificateInLinuxTrustStore = async ({ logger, rootCertificatePEM }) => {
  logger.debug(`Searching root certificate in linux trust store`)
  const rootCertificateInTrustStore = existsSync(
    `/usr/local/share/ca-certificates/jsenv_certificate_authority.crt`,
  )

  if (!rootCertificateInTrustStore) {
    logger.debug(`Root certificate is not in linux trust store`)
    return false
  }

  const rootCertificatePEMInLinuxStore = await readFile(
    `/usr/local/share/ca-certificates/jsenv_certificate_authority.crt`,
  )
  if (rootCertificatePEMInLinuxStore !== rootCertificatePEM) {
    logger.debug(`Root certificate in linux store is different, it needs to be updated`)
    return false
  }

  logger.debug(`Root certificate already in linux store`)
  return true
}

const detectFirefox = ({ logger }) => {
  const firefoxBinFleExists = existsSync("/usr/bin/firefox")
  if (!firefoxBinFleExists) {
    logger.debug(`Firefox not detected`)
    return false
  }

  logger.debug("Firefox detected")
  return true
}
