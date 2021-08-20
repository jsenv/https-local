/*
 * see https://github.com/davewasmer/devcert/blob/master/src/platforms/win32.ts
 */

import { createDetailedMessage } from "@jsenv/logger"
import { urlToFileSystemPath } from "@jsenv/filesystem"

import { exec } from "../exec.js"

export { ensureHostnamesRegistration } from "./shared.js"

export const ensureRootCertificateRegistration = async ({
  logger,
  rootCertificateFileUrl,
  rootCertificatePEM,

  tryToTrustRootCertificate,
}) => {
  const isInWindowsTrustStore = await detectRootCertificateInWindowsTrustStore({
    logger,
    rootCertificatePEM,
  })

  if (!isInWindowsTrustStore) {
    // https://docs.microsoft.com/en-us/windows-server/administration/windows-commands/certutil
    const certUtilCommand = `certutil -addstore -user root "${urlToFileSystemPath(
      rootCertificateFileUrl,
    )}"`

    if (tryToTrustRootCertificate) {
      logger.info(`
Adding root certificate to windows trust store
> ${certUtilCommand}
`)
      try {
        await exec(certUtilCommand)
      } catch (e) {
        logger.error(
          createDetailedMessage(`Failed to add root certificate to windows trust store`, {
            "error stack": e.stack,
            "root certificate file url": rootCertificateFileUrl,
          }),
        )
      }
    } else {
      logger.info(`
${createDetailedMessage(`Root certificate must be added to windows trust store`, {
  "root certificate file": urlToFileSystemPath(rootCertificateFileUrl),
  "suggested command": `> ${certUtilCommand}`,
})}
`)
    }
  }
}

const detectRootCertificateInWindowsTrustStore = async ({ logger }) => {
  // https://docs.microsoft.com/en-us/windows-server/administration/windows-commands/certutil#-viewstore
  const certutilStoreCommand = `certutil -store -user root`
  logger.debug(`
Searching root certificate in windows trust store
> ${certutilStoreCommand}
`)
  const certutilStoreCommandOutput = await exec(certutilStoreCommand)

  // it's not super accurate and do not take into account if the cert is different
  // but it's the best I could do with certutil command on windows
  const rootCertificateInStore = certutilStoreCommandOutput.includes(
    "Jsenv localhost root certificate",
  )
  if (!rootCertificateInStore) {
    logger.debug(`Root certificate is not in windows trust store`)
    return false
  }

  logger.debug(`Root certificate found in windows trust store`)
  return true
}
