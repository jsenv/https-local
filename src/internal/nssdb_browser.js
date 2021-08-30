import { createDetailedMessage } from "@jsenv/logger"

import {
  okSign,
  infoSign,
  warningSign,
  failureSign,
} from "@jsenv/local-https-certificates/src/internal/logs.js"
import {
  getCertificateInfoFromNSSDB,
  addCertificateToNSSDB,
  removeCertificateFromNSSDB,
} from "@jsenv/local-https-certificates/src/internal/nssdb.js"

export const getCertificateTrustInfoFromBrowserNSSDB = async ({
  logger,

  getBrowserInfo,
  getNSSCommandInfo,

  certificate,
  certificateCommonName,
  newAndTryToTrustDisabled,
}) => {
  const { browserName, browserDetected, browserNSSDBDirectoryUrl } = getBrowserInfo({ logger })

  if (!browserDetected) {
    return {
      status: "other",
      reason: `${browserName} not detected`,
    }
  }

  if (newAndTryToTrustDisabled) {
    logger.info(`${infoSign} You should add certificate to ${browserName}`)
    return {
      status: "not_trusted",
      reason: "certificate is new and tryToTrust is disabled",
    }
  }

  logger.info(`Check if certificate is trusted by ${browserName}...`)
  const { nssCommandName, nssIsInstalled, getCertutilBinPath } = await getNSSCommandInfo({ logger })
  if (!nssIsInstalled) {
    const reason = `"${nssCommandName}" is not installed`
    logger.info(
      createDetailedMessage(
        `${infoSign} Unable to detect if certificate is trusted by ${browserName}`,
        {
          reason,
        },
      ),
    )
    return {
      status: "unknown",
      reason,
    }
  }

  const { failed, reason, missingCount, outdatedCount, foundCount } =
    await getCertificateInfoFromNSSDB({
      logger,
      browserNSSDBDirectoryUrl,
      getCertutilBinPath,

      certificate,
      certificateCommonName,
    })

  if (failed) {
    logger.warn(
      createDetailedMessage(
        `${warningSign} Unable to detect if certificate is trusted by ${browserName}`,
      ),
      { reason },
    )
    return {
      status: "unknown",
      reason,
    }
  }

  if (missingCount > 0) {
    logger.debug(`${infoSign} certificate missing in ${missingCount} nss database file`)
    logger.info(`${infoSign} certificate not trusted by ${browserName}`)
    return {
      status: "not_trusted",
      reason: `missing in some ${browserName} nss database file`,
    }
  }

  if (outdatedCount > 0) {
    logger.debug(`${infoSign} certificate outdated in ${outdatedCount} nss database file`)
    logger.info(`${infoSign} certificate not trusted by ${browserName}`)
    return {
      status: "not_trusted",
      reason: `outdated in some ${browserName} nss database file`,
    }
  }

  logger.debug(`${okSign} certificate found in ${foundCount} nss database file`)
  logger.info(`${okSign} certificate trusted by ${browserName}`)
  return {
    status: "trusted",
    reason: `found in all ${browserName} nss database file`,
  }
}

export const addCertificateInBrowserNSSDB = async ({
  logger,

  getBrowserInfo,
  getNSSCommandInfo,

  certificateFileUrl,
  certificateCommonName,

  NSSDynamicInstall,
  existingTrustInfo,
}) => {
  const { browserName, browserDetected, NSSDBDirectoryUrl, getBrowserClosedPromise } =
    getBrowserInfo({ logger })

  if (existingTrustInfo && existingTrustInfo[browserName].status === "other") {
    return existingTrustInfo[browserName]
  }

  if (!browserDetected) {
    return {
      status: "other",
      reason: `${browserName} not detected`,
    }
  }

  logger.info(`Adding certificate in ${browserName}...`)
  const {
    nssCommandName,
    nssIsInstalled,
    nssIsInstallable,
    nssNotInstallableReason,
    nssInstallFixSuggestion,
    nssInstall,
    getCertutilBinPath,
  } = await getNSSCommandInfo({
    logger,
  })
  if (!nssIsInstalled) {
    if (!nssIsInstallable) {
      const reason = `"${nssCommandName}" is not installed and not cannot be installed`
      logger.warn(
        createDetailedMessage(`${failureSign} cannot add certificate in ${browserName}`, {
          reason,
          "reason it cannot be installed": nssNotInstallableReason,
          "suggested solution": nssInstallFixSuggestion,
        }),
      )
      return {
        status: "unknown",
        reason,
      }
    }

    if (!NSSDynamicInstall) {
      const reason = `"${nssCommandName}" is not installed and NSSDynamicInstall is false`
      logger.warn(
        createDetailedMessage(`${failureSign} cannot add certificate in ${browserName}`, {
          reason,
          "suggested solution": `Allow "${nssCommandName}" dynamic install with NSSDynamicInstall: true`,
        }),
      )
      return {
        status: "unknown",
        reason,
      }
    }

    try {
      await nssInstall()
    } catch (e) {
      logger.error(
        createDetailedMessage(`${failureSign} cannot add certificate in ${browserName}`, {
          "reason": `error while trying to install "${nssCommandName}"`,
          "error stack": e.stack,
        }),
      )
      return {
        status: "unknown",
        reason: `"${nssCommandName}" installation failed`,
      }
    }
  }

  const { failed, reason } = await addCertificateToNSSDB({
    logger,
    NSSDBDirectoryUrl,
    getCertutilBinPath,
    getBrowserClosedPromise,

    certificateCommonName,
    certificateFileUrl,
  })

  if (failed) {
    logger.warn(
      createDetailedMessage(`${failureSign} failed to add certificate in Firefox`, {
        reason,
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

export const removeCertificateFromBrowserNSSDB = async ({
  logger,
  // certificate,
  certificateCommonName,
  certificateFileUrl,

  getBrowserInfo,
  getNSSCommandInfo,
}) => {
  const { browserName, browserDetected, browserNSSDBDirectoryUrl, getBrowserClosedPromise } =
    getBrowserInfo({ logger })

  if (!browserDetected) {
    logger.debug(`No certificate to remove from ${browserName} because it is not detected`)
    return {
      status: "other",
      reason: `${browserName} not detected`,
    }
  }

  const { nssCommandName, nssIsInstalled, getCertutilBinPath } = await getNSSCommandInfo({ logger })
  if (!nssIsInstalled) {
    // when nss is not installed we couldn't trust certificate so there is likely
    // no certificate to remove -> log level is debug
    logger.debug(
      `Cannot remove certificate from ${browserName} because "${nssCommandName}" is not installed`,
    )
    return {
      status: "unknown",
      reason: `"${nssCommandName}" is not installed`,
    }
  }

  logger.info(`Removing certificate from ${browserName}...`)

  const { failed, reason } = await removeCertificateFromNSSDB({
    logger,
    browserNSSDBDirectoryUrl,
    getCertutilBinPath,
    getBrowserClosedPromise,

    certificateCommonName,
    certificateFileUrl,
  })

  if (failed) {
    logger.warn(
      createDetailedMessage(`${warningSign} failed to remove certificate from ${browserName}`, {
        reason,
      }),
    )
    return {
      status: "unknown",
      reason,
    }
  }

  logger.info(`${okSign} certificate removed from ${browserName}`)
  return {
    status: "not_trusted",
    reason,
  }
}
