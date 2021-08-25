/*
 THis is deprecated, it will be handled differently by certificate_authority.js
*/

import { readFile } from "@jsenv/filesystem"
import { createLogger } from "@jsenv/logger"

import { getAuthorityFileInfos } from "./internal/authority_file_infos.js"
import { importNodeForge } from "./internal/forge.js"
import { requestCertificateFromAuthority } from "./internal/certificate_generator.js"

export const requestCertificateForLocalhost = async ({
  logLevel,
  logger = createLogger({ logLevel }), // to be able to catch logs during unit tests

  serverCertificateAltNames = [],
  serverCertificateValidityDurationInMs,
} = {}) => {
  const { rootCertificateFileInfo, rootPrivateKeyFileInfo } = getAuthorityFileInfos()
  if (!rootCertificateFileInfo.exsists) {
    throw new Error(
      `Certificate authority not found, "installCertificateAuthority" must be called before "requestCertificateForLocalhost"`,
    )
  }
  if (!rootPrivateKeyFileInfo.exists) {
    throw new Error(`Cannot find certificate authority private key`)
  }

  logger.debug(`Restoring certificate authority from filesystem...`)

  const { pki } = await importNodeForge()
  const rootCertificateFileContent = await readFile(rootCertificateFileInfo.url, { as: "string" })
  const rootPrivateKeyFileContent = await readFile(rootPrivateKeyFileInfo.url, { as: "string" })
  const rootForgeCertificate = pki.certificateFromPem(rootCertificateFileContent)
  const rootForgePrivateKey = pki.privateKeyFromPem(rootPrivateKeyFileContent)

  const { forgeCertificate, privateKey } = await requestCertificateFromAuthority({
    logger,
    certificateAuthority: {},
    altNames: serverCertificateAltNames,
    serialNumber: 1, // TODO: increment from authority json file
  })

  return {
    serverCertificate: serverCertificatePEM,
    serverPrivateKey: serverPrivateKeyPEM,
    rootCertificateFilePath: rootCertificateFileInfo.path,
  }
}
