import { existsSync } from "node:fs"
import { execSync } from "node:child_process"
import { createDetailedMessage } from "@jsenv/logger"
import { resolveUrl, assertAndNormalizeDirectoryUrl } from "@jsenv/filesystem"

import { memoize } from "@jsenv/local-https-certificates/src/internal/memoize.js"
import {
  getCertificateInfoFromNSSDB,
  addCertificateToNSSDB,
  removeCertificateFromNSSDB,
} from "@jsenv/local-https-certificates/src/internal/nssdb.js"
import {
  okSign,
  infoSign,
  failureSign,
  warningSign,
} from "@jsenv/local-https-certificates/src/internal/logs.js"
import { commandExists } from "@jsenv/local-https-certificates/src/internal/command.js"
import { detectNSSCommand, getCertutilBinPath } from "./mac_utils.js"

// get status reasons
const REASON_FIREFOX_NOT_DETECTED = "Firefox not detected"
const REASON_NSS_MISSING = `"nss" is not installed`
// add status reasons
const REASON_NSS_AND_BREW_MISSING = `"nss" and "brew" are not installed`
const REASON_NSS_MISSING_AND_DYNAMIC_INSTALL_DISABLED = `"nss" is not installed and NSSDynamicInstall is false`

const FIREFOX_NSSDB_DIRECTORY_URL = resolveUrl(
  `./Library/Application Support/Firefox/Profiles/`,
  assertAndNormalizeDirectoryUrl(process.env.HOME),
)

const getCertificateTrustInfoFromFirefox = async ({
  logger,
  newAndTryToTrustDisabled,
  certificate,
  certificateCommonName,
} = {}) => {
  const firefoxDetected = detectFirefox({ logger })
  if (!firefoxDetected) {
    return {
      status: "other",
      reason: REASON_FIREFOX_NOT_DETECTED,
    }
  }

  if (newAndTryToTrustDisabled) {
    logger.info(`${infoSign} You should add certificate to Firefox`)
    return {
      status: "not_trusted",
      reason: "certificate is new and tryToTrust is disabled",
    }
  }

  logger.info(`Check if certificate is trusted by Firefox...`)

  const nssAvailable = await detectNSSCommand({ logger })
  if (!nssAvailable) {
    logger.info(
      createDetailedMessage(`${infoSign} Unable to detect if certificate is trusted by Firefox`, {
        reason: REASON_NSS_MISSING,
      }),
    )
    return {
      status: "unknown",
      reason: REASON_NSS_MISSING,
    }
  }

  const { failed, reason, missingCount, outdatedCount, foundCount } =
    await getCertificateInfoFromNSSDB({
      logger,
      NSSDBDirectoryUrl: FIREFOX_NSSDB_DIRECTORY_URL,
      getCertutilBinPath,

      certificate,
      certificateCommonName,
    })

  if (failed) {
    logger.warn(
      createDetailedMessage(`${warningSign} Unable to detect if certificate is trusted by Firefox`),
      { reason },
    )
    return {
      status: "unknown",
      reason,
    }
  }

  if (missingCount > 0) {
    logger.debug(`${infoSign} certificate missing in ${missingCount} nss database file`)
    logger.info(`${infoSign} certificate not trusted by Firefox`)
    return {
      status: "not_trusted",
      reason: `missing in some Firefox nss database file`,
    }
  }

  if (outdatedCount > 0) {
    logger.debug(`${infoSign} certificate outdated in ${outdatedCount} nss database file`)
    logger.info(`${infoSign} certificate not trusted by Firefox`)
    return {
      status: "not_trusted",
      reason: `outdated in some Firefox nss database file`,
    }
  }

  logger.debug(`${okSign} certificate found in ${foundCount} nss database file`)
  logger.info(`${okSign} certificate trusted by Firefox`)
  return {
    status: "trusted",
    reason: `found in all Firefox nss database file`,
  }
}

// getCertificateTrustInfoFromFirefox({
//   logger: createLogger(),
//   certificateCommonName: "Jsenv localhost root certificate",
// })

const addCertificateInFirefoxTrustStore = async ({
  logger,
  certificateFileUrl,
  certificateCommonName,
  NSSDynamicInstall,
  existingTrustInfo,
}) => {
  if (existingTrustInfo && existingTrustInfo.firefox.status === "other") {
    return existingTrustInfo.firefox
  }

  const firefoxDetected = detectFirefox({ logger })
  if (!firefoxDetected) {
    return {
      status: "other",
      reason: REASON_FIREFOX_NOT_DETECTED,
    }
  }

  logger.info(`Adding certificate in Firefox...`)
  const nssCommandAvailable = await detectNSSCommand({ logger })
  if (!nssCommandAvailable) {
    if (!NSSDynamicInstall) {
      logger.warn(
        createDetailedMessage(`${failureSign} failed to add certificate in Firefox`, {
          "reason": REASON_NSS_MISSING_AND_DYNAMIC_INSTALL_DISABLED,
          // "suggested solution": manualInstallSuggestionMessage,
          "suggested solution": `Allow "nss" dynamic install with NSSDynamicInstall: true`,
        }),
      )
      return {
        status: "unknown",
        reason: REASON_NSS_MISSING_AND_DYNAMIC_INSTALL_DISABLED,
      }
    }

    if (!commandExists("brew")) {
      logger.warn(
        createDetailedMessage(`${failureSign} failed to add certificate in Firefox`, {
          "reason": REASON_NSS_AND_BREW_MISSING,
          "suggested solution": `install "brew" on this mac`,
          // "an other suggested solution": manualInstallSuggestionMessage,
        }),
      )
      return {
        status: "unknown",
        reason: REASON_NSS_AND_BREW_MISSING,
      }
    }

    throw new Error(`To test properly`)
    // const brewInstallCommand = `brew install nss`
    // logger.info(`certutil is not installed, trying to install certutil via Homebrew`)
    // logger.info(`> ${brewInstallCommand}`)
    // try {
    //   await exec(brewInstallCommand)
    // } catch (e) {
    //   logger.error(createDetailedMessage(`brew install nss error`, { "error stack": e.stack }))
    //   return false
    // }
  }

  const { failed, reason } = await addCertificateToNSSDB({
    logger,
    NSSDBDirectoryUrl: FIREFOX_NSSDB_DIRECTORY_URL,
    getCertutilBinPath,
    getBrowserClosedPromise: () => getFirefoxClosedPromise({ logger }),

    certificateCommonName,
    certificateFileUrl,
  })

  if (failed) {
    logger.warn(
      createDetailedMessage(`${failureSign} failed to add certificate in Firefox`, {
        reason,
        // "suggested solution": manualInstallSuggestionMessage,
      }),
    )
    return {
      status: "not_trusted",
      reason,
    }
  }

  logger.info(`${okSign} certificate added in Firefox`)
  return {
    status: "trusted",
    reason,
  }
}

const removeCertificateFromFirefoxTrustStore = async ({
  logger,
  // certificate,
  certificateCommonName,
  certificateFileUrl,
}) => {
  const firefoxDetected = detectFirefox({ logger })
  if (!firefoxDetected) {
    logger.debug(`No certificate to remove from firefox because ${REASON_FIREFOX_NOT_DETECTED}`)
    return {
      status: "other",
      reason: REASON_FIREFOX_NOT_DETECTED,
    }
  }

  const nssAvailable = await detectNSSCommand({ logger })
  if (!nssAvailable) {
    logger.debug(`Cannot remove certificate from firefox because ${REASON_NSS_MISSING}`)
    return {
      status: "unknown",
      reason: REASON_NSS_MISSING,
    }
  }

  logger.info(`Removing certificate from Firefox...`)

  const { failed, reason } = await removeCertificateFromNSSDB({
    logger,
    NSSDBDirectoryUrl: FIREFOX_NSSDB_DIRECTORY_URL,
    getCertutilBinPath,
    getBrowserClosedPromise: () => getFirefoxClosedPromise({ logger }),

    certificateCommonName,
    certificateFileUrl,
  })

  if (failed) {
    logger.warn(
      createDetailedMessage(`${warningSign} failed to remove certificate from firefox`, {
        reason,
      }),
    )
    return {
      status: "unknown",
      reason,
    }
  }

  logger.info(`${okSign} certificate removed from Firefox`)
  return {
    status: "not_trusted",
    reason,
  }
}

export const firefoxTrustStoreOnMac = {
  getCertificateTrustInfo: getCertificateTrustInfoFromFirefox,
  addCertificate: addCertificateInFirefoxTrustStore,
  removeCertificate: removeCertificateFromFirefoxTrustStore,
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
