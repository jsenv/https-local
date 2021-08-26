// https://ss64.com/osx/security.html

import { urlToFileSystemPath } from "@jsenv/filesystem"
import { createDetailedMessage } from "@jsenv/logger"

import {
  commandSign,
  okSign,
  infoSign,
  failureSign,
} from "@jsenv/https-localhost/src/internal/logs.js"
import { exec } from "@jsenv/https-localhost/src/internal/exec.js"

const systemKeychainPath = "/Library/Keychains/System.keychain"

export const getCertificateTrustInfoFromMac = async ({ logger, certificate }) => {
  const findCertificateCommand = `security find-certificate -a -p ${systemKeychainPath}`

  logger.debug(`Searching certificate in mac keychain...`)
  logger.debug(`${commandSign} ${findCertificateCommand}`)

  const findCertificateCommandOutput = await exec(findCertificateCommand)
  const certificateFoundInCommandOutput = findCertificateCommandOutput.includes(certificate)

  if (!certificateFoundInCommandOutput) {
    logger.debug(`${infoSign} certificate is not in keychain`)
    return {
      status: "not_trusted",
      reason: `not found in mac keychain`,
    }
  }

  logger.debug(`${okSign} certificate found in keychain`)
  return {
    status: "trusted",
    reason: "found in mac keychain",
  }
}

export const addCertificateInMacTrustStore = async ({ logger, certificateFileUrl }) => {
  const addTrustedCertCommand = `sudo security add-trusted-cert -d -r trustRoot -k ${systemKeychainPath} -p ssl -p basic "${urlToFileSystemPath(
    certificateFileUrl,
  )}"`
  logger.info(`Adding certificate to mac keychain...`)
  logger.info(`${commandSign} ${addTrustedCertCommand}`)
  try {
    await exec(addTrustedCertCommand)
    logger.info(`${okSign} certificate added to mac keychain`)
    return {
      status: "trusted",
      reason: "add trusted cert command completed",
    }
  } catch (e) {
    logger.error(
      createDetailedMessage(`${failureSign} Failed to add certificate to mac keychain`, {
        "error stack": e.stack,
        "root certificate file url": certificateFileUrl,
      }),
    )
    return {
      status: "not_trusted",
      reason: "add trusted cert command failed",
    }
  }
}

export const removeCertificateFromMacTrustStore = async ({
  logger,
  certificate,
  certificateFileUrl,
}) => {
  // ensure it's in mac keychain or the command to remove would fail
  const trustInfo = await getCertificateTrustInfoFromMac({
    logger,
    certificate,
  })
  if (trustInfo.status === "not_trusted") {
    return trustInfo
  }

  const removeTrustedCertCommand = `sudo security remove-trusted-cert -d -r trustRoot -k ${systemKeychainPath} -p ssl -p basic "${urlToFileSystemPath(
    certificateFileUrl,
  )}"`
  logger.info(`Removing certificate from mac keychain...`)
  logger.info(`${commandSign} ${removeTrustedCertCommand}`)
  try {
    await exec(removeTrustedCertCommand)
    logger.info(`${okSign} certificate removed from mac keychain`)
    return {
      status: "not_trusted",
      reason: "remove trusted cert command completed",
    }
  } catch (e) {
    logger.error(
      createDetailedMessage(`${failureSign} Failed to remove certificate from mac keychain`, {
        "error stack": e.stack,
        "certificate file url": certificateFileUrl,
      }),
    )
    return {
      status: "unknown", // maybe it was not trusted?
      reason: "remove trusted cert command failed",
    }
  }
}
