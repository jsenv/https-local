// https://ss64.com/osx/security.html

import { urlToFileSystemPath } from "@jsenv/filesystem"
import { createDetailedMessage } from "@jsenv/logger"

import {
  commandSign,
  okSign,
  infoSign,
  failureSign,
} from "@jsenv/https-local/src/internal/logs.js"
import { exec } from "@jsenv/https-local/src/internal/exec.js"
import { searchCertificateInCommandOutput } from "@jsenv/https-local/src/internal/search_certificate_in_command_output.js"
import {
  VERB_CHECK_TRUST,
  VERB_ADD_TRUST,
  VERB_REMOVE_TRUST,
} from "../trust_query.js"

const REASON_NEW_AND_TRY_TO_TRUST_DISABLED =
  "certificate is new and tryToTrust is disabled"
const REASON_NOT_IN_KEYCHAIN = "certificate not found in mac keychain"
const REASON_IN_KEYCHAIN = "certificate found in mac keychain"
const REASON_ADD_TO_KEYCHAIN_COMMAND_FAILED =
  "command to add certificate in mac keychain failed"
const REASON_ADD_TO_KEYCHAIN_COMMAND_COMPLETED =
  "command to add certificate in mac keychain completed"
const REASON_REMOVE_FROM_KEYCHAIN_COMMAND_FAILED =
  "command to remove certificate from mac keychain failed"
const REASON_REMOVE_FROM_KEYCHAIN_COMMAND_COMPLETED =
  "command to remove certificate from mac keychain completed"

const systemKeychainPath = "/Library/Keychains/System.keychain"

export const executeTrustQueryOnMacKeychain = async ({
  logger,
  certificateCommonName,
  certificateFileUrl,
  certificateIsNew,
  certificate,
  verb,
}) => {
  if (verb === VERB_CHECK_TRUST && certificateIsNew) {
    logger.info(`${infoSign} You should add certificate to mac keychain`)
    return {
      status: "not_trusted",
      reason: REASON_NEW_AND_TRY_TO_TRUST_DISABLED,
    }
  }

  logger.info(`Check if certificate is in mac keychain...`)
  // https://ss64.com/osx/security-find-cert.html
  const findCertificateCommand = `security find-certificate -a -p ${systemKeychainPath}`
  logger.debug(`${commandSign} ${findCertificateCommand}`)
  const findCertificateCommandOutput = await exec(findCertificateCommand)
  const certificateFoundInCommandOutput = searchCertificateInCommandOutput(
    findCertificateCommandOutput,
    certificate,
  )

  if (!certificateFoundInCommandOutput) {
    logger.info(`${infoSign} certificate not found in mac keychain`)
    if (verb === VERB_CHECK_TRUST || verb === VERB_REMOVE_TRUST) {
      return {
        status: "not_trusted",
        reason: REASON_NOT_IN_KEYCHAIN,
      }
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
        createDetailedMessage(
          `${failureSign} failed to add certificate to mac keychain`,
          {
            "error stack": e.stack,
            "certificate file": certificateFilePath,
          },
        ),
      )
      return {
        status: "not_trusted",
        reason: REASON_ADD_TO_KEYCHAIN_COMMAND_FAILED,
      }
    }
  }

  // being in the keychain do not guarantee certificate is trusted
  // people can still manually untrust the root cert
  // but they shouldn't and I couldn't find an API to know if the cert is trusted or not
  // just if it's in the keychain
  logger.info(`${okSign} certificate found in mac keychain`)
  if (verb === VERB_CHECK_TRUST || verb === VERB_ADD_TRUST) {
    return {
      status: "trusted",
      reason: REASON_IN_KEYCHAIN,
    }
  }

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
      createDetailedMessage(
        `${failureSign} failed to remove certificate from mac keychain`,
        {
          "error stack": e.stack,
          "certificate file url": certificateFileUrl,
        },
      ),
    )
    return {
      status: "not_trusted",
      reason: REASON_REMOVE_FROM_KEYCHAIN_COMMAND_FAILED,
    }
  }
}
