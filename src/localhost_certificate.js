import { readFile, writeFile } from "@jsenv/filesystem"
import { createLogger, createDetailedMessage } from "@jsenv/logger"

import {
  createValidityDurationOfXDays,
  verifyServerCertificateValidityDuration,
} from "./validity_duration.js"
import { okSign } from "./internal/logs.js"
import { getAuthorityFileInfos } from "./internal/authority_file_infos.js"
import { importNodeForge } from "./internal/forge.js"
import { requestCertificateFromAuthority } from "./internal/certificate_generator.js"
import { formatDuration } from "./internal/validity_formatting.js"

export const requestCertificateForLocalhost = async ({
  logLevel,
  logger = createLogger({ logLevel }), // to be able to catch logs during unit tests

  serverCertificateAltNames = [],
  serverCertificateValidityDurationInMs = createValidityDurationOfXDays(396),
} = {}) => {
  if (typeof serverCertificateValidityDurationInMs !== "number") {
    throw new TypeError(
      `serverCertificateValidityDurationInMs must be a number but received ${serverCertificateValidityDurationInMs}`,
    )
  }
  if (serverCertificateValidityDurationInMs < 1) {
    throw new TypeError(
      `serverCertificateValidityDurationInMs must be > 0 but received ${serverCertificateValidityDurationInMs}`,
    )
  }
  const serverCertificateValidityDuration = verifyServerCertificateValidityDuration(
    serverCertificateValidityDurationInMs,
  )
  if (!serverCertificateValidityDuration.ok) {
    serverCertificateValidityDurationInMs = serverCertificateValidityDuration.maxAllowedValue
    logger.warn(
      createDetailedMessage(serverCertificateValidityDuration.message, {
        details: serverCertificateValidityDuration.details,
      }),
    )
  }

  const { authorityJsonFileInfo, rootCertificateFileInfo, rootPrivateKeyFileInfo } =
    getAuthorityFileInfos()
  if (!rootCertificateFileInfo.exists) {
    throw new Error(
      `Certificate authority not found, "installCertificateAuthority" must be called before "requestCertificateForLocalhost"`,
    )
  }
  if (!rootPrivateKeyFileInfo.exists) {
    throw new Error(`Cannot find certificate authority private key`)
  }
  if (!authorityJsonFileInfo.exists) {
    throw new Error(`Cannot find certificate authority json file`)
  }

  logger.debug(`Restoring certificate authority from filesystem...`)
  const { pki } = await importNodeForge()
  const rootCertificateFileContent = await readFile(rootCertificateFileInfo.url, { as: "string" })
  const rootPrivateKeyFileContent = await readFile(rootPrivateKeyFileInfo.url, { as: "string" })
  const certificateAuthorityData = await readFile(authorityJsonFileInfo.url, { as: "json" })
  const rootForgeCertificate = pki.certificateFromPem(rootCertificateFileContent)
  const rootForgePrivateKey = pki.privateKeyFromPem(rootPrivateKeyFileContent)
  logger.debug(`${okSign} certificate authority restored from filesystem`)

  const serverCertificateSerialNumber = certificateAuthorityData.serialNumber + 1
  await writeFile(
    authorityJsonFileInfo.url,
    JSON.stringify({ serialNumber: serverCertificateSerialNumber }, null, "  "),
  )

  logger.debug(`Generating server certificate...`)
  const { forgeCertificate, privateKey } = await requestCertificateFromAuthority({
    logger,
    rootForgeCertificate,
    rootForgePrivateKey,
    serverCertificateAltNames,
    serverCertificateSerialNumber,
    serverCertificateValidityDurationInMs,
  })
  const serverCertificate = pki.certificateToPem(forgeCertificate)
  const serverPrivateKey = pki.privateKeyToPem(privateKey)
  logger.debug(
    `${okSign} server certificate generated, it will be valid for ${formatDuration(
      serverCertificateValidityDurationInMs,
    )}`,
  )

  return {
    serverCertificate,
    serverPrivateKey,
    rootCertificateFilePath: rootCertificateFileInfo.path,
  }
}
