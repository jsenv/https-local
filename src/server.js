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
  const validityDurationInfo = verifyServerCertificateValidityDuration(
    serverCertificateValidityDurationInMs,
  )
  if (!validityDurationInfo.ok) {
    serverCertificateValidityDurationInMs = validityDurationInfo.maxAllowedValue
    logger.warn(
      createDetailedMessage(validityDurationInfo.message, {
        details: validityDurationInfo.details,
      }),
    )
  }

  const { authorityJsonFileInfo, rootCertificateFileInfo, rootCertificatePrivateKeyFileInfo } =
    getAuthorityFileInfos()
  if (!rootCertificateFileInfo.exists) {
    throw new Error(
      `Certificate authority not found, "installCertificateAuthority" must be called before "requestCertificateForLocalhost"`,
    )
  }
  if (!rootCertificatePrivateKeyFileInfo.exists) {
    throw new Error(`Cannot find authority root certificate private key`)
  }
  if (!authorityJsonFileInfo.exists) {
    throw new Error(`Cannot find authority json file`)
  }

  logger.debug(`Restoring certificate authority from filesystem...`)
  const { pki } = await importNodeForge()
  const rootCertificate = await readFile(rootCertificateFileInfo.url, { as: "string" })
  const rootCertificatePrivateKey = await readFile(rootCertificatePrivateKeyFileInfo.url, {
    as: "string",
  })
  const certificateAuthorityData = await readFile(authorityJsonFileInfo.url, { as: "json" })
  const rootCertificateForgeObject = pki.certificateFromPem(rootCertificate)
  const rootCertificatePrivateKeyForgeObject = pki.privateKeyFromPem(rootCertificatePrivateKey)
  logger.debug(`${okSign} certificate authority restored from filesystem`)

  const serverCertificateSerialNumber = certificateAuthorityData.serialNumber + 1
  await writeFile(
    authorityJsonFileInfo.url,
    JSON.stringify({ serialNumber: serverCertificateSerialNumber }, null, "  "),
  )

  logger.debug(`Generating server certificate...`)
  const { certificateForgeObject, certificatePrivateKeyForgeObject } =
    await requestCertificateFromAuthority({
      logger,
      authorityCertificateForgeObject: rootCertificateForgeObject,
      auhtorityCertificatePrivateKeyForgeObject: rootCertificatePrivateKeyForgeObject,
      serialNumber: serverCertificateSerialNumber,
      altNames: serverCertificateAltNames,
      validityDurationInMs: serverCertificateValidityDurationInMs,
    })
  const serverCertificate = pki.certificateToPem(certificateForgeObject)
  const serverCertificatePrivateKey = pki.privateKeyToPem(certificatePrivateKeyForgeObject)
  logger.debug(
    `${okSign} server certificate generated, it will be valid for ${formatDuration(
      serverCertificateValidityDurationInMs,
    )}`,
  )

  return {
    serverCertificate,
    serverCertificatePrivateKey,
    rootCertificateFilePath: rootCertificateFileInfo.path,
  }
}
