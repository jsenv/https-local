// https://ss64.com/osx/security.html

import { urlToFileSystemPath } from "@jsenv/filesystem"
import { createDetailedMessage } from "@jsenv/logger"

import {
  commandSign,
  okSign,
  infoSign,
  failureSign,
} from "@jsenv/local-https-certificates/src/internal/logs.js"
import { exec } from "@jsenv/local-https-certificates/src/internal/exec.js"
import { searchCertificateInCommandOutput } from "@jsenv/local-https-certificates/src/internal/search_certificate_in_command_output.js"

const REASON_NEW_AND_TRY_TO_TRUST_DISABLED = "certificate is new and tryToTrust is disabled"
const REASON_NOT_IN_KEYCHAIN = "certificate not found in mac keychain"
const REASON_IN_KEYCHAIN = "certificate found in mac keychain"
const REASON_ADD_TO_KEYCHAIN_COMMAND_FAILED = "command to add certificate in mac keychain failed"
const REASON_ADD_TO_KEYCHAIN_COMMAND_COMPLETED =
  "command to add certificate in mac keychain completed"
const REASON_REMOVE_FROM_KEYCHAIN_COMMAND_FAILED =
  "command to remove certificate from mac keychain failed"
const REASON_REMOVE_FROM_KEYCHAIN_COMMAND_COMPLETED =
  "command to remove certificate from mac keychain completed"

const systemKeychainPath = "/Library/Keychains/System.keychain"

const getCertificateTrustInfoFromMac = async ({
  logger,
  newAndTryToTrustDisabled,
  certificate,
}) => {
  if (newAndTryToTrustDisabled) {
    logger.info(`${infoSign} You should add certificate to mac OS keychain`)
    return {
      status: "not_trusted",
      reason: REASON_NEW_AND_TRY_TO_TRUST_DISABLED,
    }
  }

  logger.info(`Check if certificate is trusted by mac OS...`)
  // https://ss64.com/osx/security-find-cert.html
  const findCertificateCommand = `security find-certificate -a -p ${systemKeychainPath}`
  logger.debug(`Searching certificate in mac keychain...`)
  logger.debug(`${commandSign} ${findCertificateCommand}`)
  const findCertificateCommandOutput = await exec(findCertificateCommand)
  const certificateFoundInCommandOutput = searchCertificateInCommandOutput(
    findCertificateCommandOutput,
    certificate,
  )

  if (!certificateFoundInCommandOutput) {
    logger.debug(`${infoSign} certificate is not in keychain`)
    logger.info(`${infoSign} certificate not trusted by mac OS`)
    return {
      status: "not_trusted",
      reason: REASON_NOT_IN_KEYCHAIN,
    }
  }

  // being in the keychain do not guarantee certificate is trusted
  // people can still manually untrust the root cert
  // but they shouldn't and I couldn't find an API to know if the cert is trusted or not
  // just if it's in the keychain
  logger.debug(`${okSign} certificate found in keychain`)
  logger.info(`${okSign} certificate trusted by mac OS`)
  return {
    status: "trusted",
    reason: REASON_IN_KEYCHAIN,
  }
}

const addCertificateInMacTrustStore = async ({ logger, certificateFileUrl, existingTrustInfo }) => {
  if (existingTrustInfo && existingTrustInfo.mac.status === "trusted") {
    return existingTrustInfo.mac
  }

  const certificateFilePath = urlToFileSystemPath(certificateFileUrl)
  // https://ss64.com/osx/security-cert.html
  const addTrustedCertCommand = `sudo security add-trusted-cert -d -r trustRoot -k ${systemKeychainPath} "${certificateFilePath}"`
  logger.info(`Adding certificate to mac keychain...`)
  logger.info(`${commandSign} ${addTrustedCertCommand}`)
  try {
    await exec(addTrustedCertCommand)
    logger.info(`${okSign} certificate added to mac keychain`)
    return {
      status: "trusted",
      reason: REASON_ADD_TO_KEYCHAIN_COMMAND_COMPLETED,
    }
  } catch (e) {
    logger.error(
      createDetailedMessage(`${failureSign} Failed to add certificate to mac keychain`, {
        "error stack": e.stack,
        "certificate file": certificateFilePath,
      }),
    )
    return {
      status: "not_trusted",
      reason: REASON_ADD_TO_KEYCHAIN_COMMAND_FAILED,
    }
  }
}

const removeCertificateFromMacTrustStore = async ({
  logger,
  // certificate,
  certificateCommonName,
  certificateFileUrl,
}) => {
  // ensure it's in mac keychain or the command to remove would fail
  // const trustInfo = await getCertificateTrustInfoFromMac({
  //   logger,
  //   certificate,
  //   certificateCommonName,
  // })
  // if (trustInfo.status === "not_trusted") {
  //   return trustInfo
  // }

  // https://ss64.com/osx/security-cert.html
  // https://ss64.com/osx/security-delete-cert.html
  const removeTrustedCertCommand = `sudo security delete-certificate -c "${certificateCommonName}"`
  logger.info(`Removing certificate from mac keychain...`)
  logger.info(`${commandSign} ${removeTrustedCertCommand}`)
  try {
    await exec(removeTrustedCertCommand)
    logger.info(`${okSign} certificate removed from mac keychain`)
    return {
      status: "not_trusted",
      reason: REASON_REMOVE_FROM_KEYCHAIN_COMMAND_COMPLETED,
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
      reason: REASON_REMOVE_FROM_KEYCHAIN_COMMAND_FAILED,
    }
  }
}

export const macTrustStore = {
  getCertificateTrustInfo: getCertificateTrustInfoFromMac,
  addCertificate: addCertificateInMacTrustStore,
  removeCertificate: removeCertificateFromMacTrustStore,
}
