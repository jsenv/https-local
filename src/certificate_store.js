import { existsSync } from "node:fs"
import { createLogger } from "@jsenv/logger"
import { resolveUrl, readFile, writeFile, urlToFileSystemPath } from "@jsenv/util"

import { createRootCertificate, createCertificate } from "./certificate_generator.js"
import { parseCertificate } from "./certificate_parser.js"
import { platformTrustStore } from "./platform_trust_store.js"

const CERTIFICATES_DIR_PATH = resolveUrl("../certificates/", import.meta.url)

export const getCertificate = async (
  altNames,
  {
    logLevel,
    certificateParams = {},
    rootCertificateParams = {
      organizationName: "jsenv",
      organizationalUnitName: "jsenv https certificate",
    },
  } = {},
) => {
  const logger = createLogger({ logLevel })

  const { organizationalUnitName, organizationName } = rootCertificateParams
  const rootCertificateName = organizationalUnitName || organizationName
  if (typeof rootCertificateName !== "string") {
    throw new TypeError(
      `organizationalUnitName or organizationName must be a string but received ${organizationName}`,
    )
  }

  const rootCertificate = await getOrCreateRootCertificate({
    logger,
    rootCertificateName,
    rootCertificateParams,
  })
  const certificate = await getOrCreateCertificate({
    logger,
    rootCertificateName,
    rootCertificate,
    altNames,
    certificateParams,
  })
  return certificate
}

const getOrCreateRootCertificate = async ({
  logger,
  rootCertificateName,
  rootCertificateParams,
}) => {
  const rootCertificateFileUrl = resolveUrl(`${rootCertificateName}.crt`, CERTIFICATES_DIR_PATH)
  const rootCertificatePrivateKeyFileUrl = resolveUrl(
    `${rootCertificateName}.key`,
    CERTIFICATES_DIR_PATH,
  )
  const rootCertificateJSONFileUrl = resolveUrl(
    `${rootCertificateName}.json`,
    CERTIFICATES_DIR_PATH,
  )

  const createNewRootCertificate = async () => {
    const { serialNumber = 0 } = rootCertificateParams
    const rootCertificate = await createRootCertificate(rootCertificateParams)
    await writeFile(rootCertificatePrivateKeyFileUrl, rootCertificate.privateKeyPem)
    await writeFile(rootCertificateFileUrl, rootCertificate.certificatePem)
    await platformTrustStore.registerRootCertificateFile({
      certificateFileUrl: rootCertificateFileUrl,
    })
    await writeFile(rootCertificateJSONFileUrl, JSON.stringify({ serialNumber }, null, "  "))
    return rootCertificate
  }

  if (
    !fileExistsSync(rootCertificateFileUrl) ||
    !fileExistsSync(rootCertificatePrivateKeyFileUrl)
  ) {
    return createNewRootCertificate()
  }

  const rootCertificatePem = await readFile(rootCertificateFileUrl, { as: "string" })
  const rootCertificateExpirationState = checkCertificateExpirationState(rootCertificatePem)
  if (rootCertificateExpirationState.expired) {
    logger.info(
      `${rootCertificateFileUrl} root certificate is expired, a new one will be generated`,
    )
    return createNewRootCertificate()
  }
  if (rootCertificateExpirationState.aboutToExpire) {
    logger.info(
      `${rootCertificateFileUrl} root certificate is about to expire, a new one will be generated`,
    )
    return createNewRootCertificate()
  }
  const rootCertificatePrivateKeyPem = await readFile(rootCertificatePrivateKeyFileUrl, {
    as: "string",
  })
  return {
    certificatePem: rootCertificatePem,
    privateKeyPem: rootCertificatePrivateKeyPem,
  }
}

const checkCertificateExpirationState = (certificatePem) => {
  const { notValidAfterDate } = parseCertificate(certificatePem)
  const nowDate = Date.now()
  const remainingMs = nowDate - notValidAfterDate
  if (remainingMs < 0) {
    return {
      expired: true,
    }
  }
  if (remainingMs < MS_IN_ONE_5_DAYS) {
    return {
      expired: true,
      aboutToExpire: true,
    }
  }
  return {
    expired: false,
    aboutToExpire: false,
  }
}

const MS_IN_ONE_5_DAYS = 1000 * 60 * 60 * 25 * 5

const fileExistsSync = (fileUrl) => {
  return existsSync(urlToFileSystemPath(fileUrl))
}

const getOrCreateCertificate = async ({
  logger,
  rootCertificateName,
  rootCertificate,
  altNames,
  certificateParams,
}) => {
  const certificateName = `${rootCertificateName}_child`
  const certificateFileUrl = resolveUrl(`${certificateName}.crt`, CERTIFICATES_DIR_PATH)
  const certificatePrivateKeyFileUrl = resolveUrl(
    `${rootCertificateName}.key`,
    CERTIFICATES_DIR_PATH,
  )

  const createNewCertificate = async () => {
    const rootCertificateJSONFileUrl = resolveUrl(
      `${rootCertificateName}.json`,
      CERTIFICATES_DIR_PATH,
    )
    const rootCertificateJSON = await readFile(rootCertificateJSONFileUrl, { as: "json" })
    const lastSerialNumber = await readFile(rootCertificateJSONFileUrl, { as: "json" }).serialNumber
    await writeFile(
      rootCertificateJSONFileUrl,
      JSON.stringify({
        ...rootCertificateJSON,
        serialNumber: lastSerialNumber + 1,
      }),
    )
    const certificate = await createCertificate({
      rootCertificate,
      altNames,
      serialNumber: lastSerialNumber + 1,
      ...certificateParams,
    })
    await writeFile(certificatePrivateKeyFileUrl, certificate.privateKeyPem)
    await writeFile(certificateFileUrl, certificate.certificatePem)
    return certificate
  }

  if (!fileExistsSync(certificateFileUrl) || !fileExistsSync(certificatePrivateKeyFileUrl)) {
    return createNewCertificate()
  }

  const certificatePem = await readFile(certificateFileUrl, { as: "string" })
  const certificateExpirationState = checkCertificateExpirationState(certificatePem)
  if (certificateExpirationState.expired) {
    logger.info(`${certificateFileUrl} certificate is expired, a new one will be generated`)
    return createNewCertificate()
  }
  if (certificateExpirationState.aboutToExpire) {
    logger.info(`${certificateFileUrl} certificate is about to expire, a new one will be generated`)
    return createNewCertificate()
  }
  const certificatePrivateKeyPem = await readFile(certificatePrivateKeyFileUrl, {
    as: "string",
  })
  return {
    certificatePem,
    privateKeyPem: certificatePrivateKeyPem,
  }
}
