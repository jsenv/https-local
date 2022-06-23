import { readFileSync } from "node:fs"
import { writeFileSync } from "@jsenv/filesystem"
import { UNICODE, createLogger, createDetailedMessage } from "@jsenv/log"

import { forge } from "./internal/forge.js"
import {
  createValidityDurationOfXDays,
  verifyServerCertificateValidityDuration,
} from "./validity_duration.js"
import { getAuthorityFileInfos } from "./internal/authority_file_infos.js"
import { requestCertificateFromAuthority } from "./internal/certificate_generator.js"
import { formatDuration } from "./internal/validity_formatting.js"

export const requestCertificateForLocalhost = ({
  logLevel,
  logger = createLogger({ logLevel }), // to be able to catch logs during unit tests

  serverCertificateAltNames = ["localhost"],
  serverCertificateCommonName = "https local server certificate",
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

  const {
    authorityJsonFileInfo,
    rootCertificateFileInfo,
    rootCertificatePrivateKeyFileInfo,
  } = getAuthorityFileInfos()
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
  const { pki } = forge
  const rootCertificate = String(readFileSync(rootCertificateFileInfo.url))
  const rootCertificatePrivateKey = String(
    readFileSync(rootCertificatePrivateKeyFileInfo.url),
  )
  const certificateAuthorityData = JSON.parse(
    String(readFileSync(authorityJsonFileInfo.url)),
  )
  const rootCertificateForgeObject = pki.certificateFromPem(rootCertificate)
  const rootCertificatePrivateKeyForgeObject = pki.privateKeyFromPem(
    rootCertificatePrivateKey,
  )
  logger.debug(`${UNICODE.OK} certificate authority restored from filesystem`)

  const serverCertificateSerialNumber =
    certificateAuthorityData.serialNumber + 1
  writeFileSync(
    authorityJsonFileInfo.url,
    JSON.stringify({ serialNumber: serverCertificateSerialNumber }, null, "  "),
  )

  if (!serverCertificateAltNames.includes("localhost")) {
    serverCertificateAltNames.push("localhost")
  }

  logger.debug(`Generating server certificate...`)
  const { certificateForgeObject, certificatePrivateKeyForgeObject } =
    requestCertificateFromAuthority({
      logger,
      authorityCertificateForgeObject: rootCertificateForgeObject,
      auhtorityCertificatePrivateKeyForgeObject:
        rootCertificatePrivateKeyForgeObject,
      serialNumber: serverCertificateSerialNumber,
      altNames: serverCertificateAltNames,
      commonName: serverCertificateCommonName,
      validityDurationInMs: serverCertificateValidityDurationInMs,
    })
  const serverCertificate = pki.certificateToPem(certificateForgeObject)
  const serverCertificatePrivateKey = pki.privateKeyToPem(
    certificatePrivateKeyForgeObject,
  )
  logger.debug(
    `${
      UNICODE.OK
    } server certificate generated, it will be valid for ${formatDuration(
      serverCertificateValidityDurationInMs,
    )}`,
  )

  return {
    serverCertificate,
    serverCertificatePrivateKey,
    rootCertificateFilePath: rootCertificateFileInfo.path,
  }
}
