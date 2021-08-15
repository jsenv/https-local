import { existsSync } from "node:fs"
import { createLogger } from "@jsenv/logger"
import {
  resolveUrl,
  readFile,
  writeFile,
  urlToFileSystemPath,
  assertAndNormalizeFileUrl,
  urlToBasename,
} from "@jsenv/util"

import { importNodeForge } from "./internal/forge.js"
import { attributeDescriptionFromAttributeArray } from "./internal/certificate_data_converter.js"
import { formatExpired, formatAboutToExpire } from "./internal/validity_formatting.js"
import {
  createCertificateAuthority,
  requestCertificateFromAuthority,
} from "./certificate_generator.js"

// serial management https://datatracker.ietf.org/doc/html/rfc5280#section-4.1.2.2

export const requestCertificateForLocalhost = async ({
  logLevel,
  logger = createLogger({ logLevel }), // to be able to catch logs during unit tests

  serverCertificateFileUrl,
  rootCertificateSerialNumber = 0,
  rootCertificateOrganizationName = "jsenv",
  rootCertificateOrganizationalUnitName = "https-localhost",
  serverCertificateAltNames = [],
  rootCertificateAutoTrust = false,
  // user less likely to use the params below
  serverCertificateOrganizationName = rootCertificateOrganizationName,

  shouldTrustNewRootCertificate = ({ certificateFilePath }) => {
    logger.info(`${certificateFilePath} root certificate needs to be trusted`)
    // import { platformTrustStore } from "./platform_trust_store.js"
  },
  shouldTrustUpdatedRootCertificate = ({ certificateFilePath }) => {
    logger.info(`${certificateFilePath} root certificate has changed it needs to be re-trusted`)
    // user must untrust the existing certificate then add it back
  },
  onRootCertificateReused = () => {},
} = {}) => {
  serverCertificateFileUrl = assertAndNormalizeFileUrl(serverCertificateFileUrl)
  const rootCertificateFileUrl = new URL(
    "./jsenv_certificate_authority.crt",
    JSENV_CERTIFICATE_AUTHORITY_DIRECTORY_URL,
  )
  const rootCertificateFilePath = urlToFileSystemPath(rootCertificateFileUrl)
  const certificateAuthorityJsonFileUrl = new URL(
    "./jsenv_certificate_authority.json",
    JSENV_CERTIFICATE_AUTHORITY_DIRECTORY_URL,
  )

  const { pki } = await importNodeForge()

  const normalizeReturnValue = ({ certificateAuthority, serverCertificate }) => {
    return {
      rootCertificate: pki.certificateToPem(certificateAuthority.forgeCertificate),
      rootPrivateKey: pki.privateKeyToPem(certificateAuthority.privateKey),
      serverCertificate: pki.certificateToPem(serverCertificate.forgeCertificate),
      serverPrivateKey: pki.privateKeyToPem(serverCertificate.privateKey),
    }
  }

  const rootPrivateKeyFileUrl = resolveUrl(
    `${urlToBasename(rootCertificateFileUrl)}.key`,
    certificatesDirectoryUrl,
  )

  const generateCertificateAuthorityAndFiles = async () => {
    logger.info(`Generating root certificate files`)
    const certificateAuthority = await createCertificateAuthority({
      organizationName: rootCertificateOrganizationName,
      organizationalUnitName: rootCertificateOrganizationalUnitName,
      serialNumber: rootCertificateSerialNumber,
    })
    await writeFile(
      rootCertificateFileUrl,
      pki.certificateToPem(certificateAuthority.forgeCertificate),
    )
    await writeFile(rootPrivateKeyFileUrl, pki.privateKeyToPem(certificateAuthority.privateKey))

    await writeFile(
      certificateAuthorityJsonFileUrl,
      JSON.stringify({ serialNumber: rootCertificateSerialNumber }, null, "  "),
    )

    return certificateAuthority
  }

  const createOrReuseServerCertificate = async ({ certificateAuthority }) => {
    // when serverCertificateAltNames is used
    // we should also tell user what to do:
    // -> add some line into etc/hosts
    // here again take inspiration from
    // devcert but without running the command
    // let the user do it

    const serverCertificateFileUrl = resolveUrl(serverCertificateFilename, certificatesDirectoryUrl)
    const serverPrivateKeyFileUrl = resolveUrl(
      `${urlToBasename(serverCertificateFileUrl)}.key`,
      certificatesDirectoryUrl,
    )

    const generateServerCertificateAndFiles = async () => {
      const rootCertificateJSONFileUrl = resolveUrl(
        `${rootCertificateName}.json`,
        CERTIFICATES_DIR_PATH,
      )
      const rootCertificateJSON = await readFile(rootCertificateJSONFileUrl, { as: "json" })
      const lastSerialNumber = rootCertificateJSON.serialNumber
      await writeFile(
        rootCertificateJSONFileUrl,
        JSON.stringify(
          {
            ...rootCertificateJSON,
            serialNumber: lastSerialNumber + 1,
          },
          null,
          "  ",
        ),
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
      logger.info(
        `${certificateFileUrl} certificate is about to expire, a new one will be generated`,
      )
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

  if (!fileExistsSync(rootCertificateFileUrl)) {
    logger.debug(`No root certificate file at ${rootCertificateFilePath}`)
    const certificateAuthority = await generateCertificateAuthorityAndFiles()
    await shouldTrustNewRootCertificate({
      rootCertificateFilePath,
    })
    const serverCertificate = await createOrReuseServerCertificate({ certificateAuthority })
    return normalizeReturnValue({
      certificateAuthority,
      serverCertificate,
    })
  }

  logger.debug(`Root certificate file found at ${certificateAuthorityJsonFileUrl}`)
  const rootCertificatePem = await readFile(rootCertificateFileUrl, { as: "string" })
  const rootForgeCertificate = pki.certificateFromPem(rootCertificatePem)
  const rootCertificateDifferences = getRootCertificateParamsDiff({
    rootForgeCertificate,
    rootCertificateSerialNumber,
    rootCertificateOrganizationName,
    rootCertificateOrganizationalUnitName,
  })
  if (rootCertificateDifferences.length) {
    const paramNames = Object.keys(rootCertificateDifferences)
    logger.debug(`Root certificate params have changed: ${paramNames}`)
    const certificateAuthority = await generateCertificateAuthorityAndFiles()
    await shouldTrustUpdatedRootCertificate({
      rootCertificateFilePath,
    })
    const serverCertificate = await createOrReuseServerCertificate({ certificateAuthority })
    return normalizeReturnValue({
      certificateAuthority,
      serverCertificate,
    })
  }

  logger.debug(`Checking root certificate validity`)
  const validityRemainingMs = getCertificateRemainingMs(rootForgeCertificate)
  if (validityRemainingMs < 0) {
    const msEllapsedSinceValid = getCertificateValidSinceInMs(rootForgeCertificate)
    const msEllapsedSinceExpiration = -validityRemainingMs
    logger.info(
      formatExpired({
        msEllapsedSinceExpiration,
        msEllapsedSinceValid,
      }),
    )
    const certificateAuthority = await generateCertificateAuthorityAndFiles()
    await shouldTrustUpdatedRootCertificate({
      rootCertificateFilePath,
    })
    const serverCertificate = await createOrReuseServerCertificate({ certificateAuthority })
    return normalizeReturnValue({
      certificateAuthority,
      serverCertificate,
    })
  }

  const validityDurationInMs = getCertificateValidityInMs(rootForgeCertificate)
  const validityRemainingMsRatio = validityDurationInMs / validityRemainingMs
  if (validityRemainingMsRatio < 0.05) {
    const msEllapsedSinceValid = getCertificateValidSinceInMs(rootForgeCertificate)
    logger.info(
      formatAboutToExpire({
        validityRemainingMs,
        msEllapsedSinceValid,
      }),
    )
    const certificateAuthority = await generateCertificateAuthorityAndFiles()
    await shouldTrustUpdatedRootCertificate({
      rootCertificateFilePath,
    })
    const serverCertificate = await createOrReuseServerCertificate({ certificateAuthority })
    return normalizeReturnValue({
      certificateAuthority,
      serverCertificate,
    })
  }
  logger.debug(`Root certificate is valid`)

  logger.debug(`Read root certificate private key at ${rootPrivateKeyFileUrl}`)
  const rootCertificatePrivateKeyPem = await readFile(rootPrivateKeyFileUrl, {
    as: "string",
  })
  const privateKey = pki.privateKeyFromPem(rootCertificatePrivateKeyPem)
  logger.debug(`Private key file found, reusing root certificate from filesystem`)

  const certificateAuthority = {
    forgeCertificate: rootForgeCertificate,
    privateKey,
  }
  await onRootCertificateReused({
    rootCertificateFilePath,
  })
  const serverCertificate = await createOrReuseServerCertificate({ certificateAuthority })
  return normalizeReturnValue({
    certificateAuthority,
    serverCertificate,
  })
}

const getRootCertificateParamsDiff = ({
  rootForgeCertificate,
  rootCertificateSerialNumber,
  rootCertificateOrganizationName,
  rootCertificateOrganizationalUnitName,
}) => {
  const attributeDescription = attributeDescriptionFromAttributeArray(
    rootForgeCertificate.subject.attributes,
  )
  const differences = {}

  const { organizationName } = attributeDescription
  if (organizationName !== rootCertificateOrganizationName) {
    differences.organizationName = {
      valueFromCertificate: organizationName,
      valueFromParam: rootCertificateOrganizationName,
    }
  }

  const { organizationalUnitName } = attributeDescription
  if (organizationalUnitName !== rootCertificateOrganizationalUnitName) {
    differences.organizationalUnitName = {
      valueFromCertificate: organizationalUnitName,
      valueFromParam: rootCertificateOrganizationalUnitName,
    }
  }

  // TODO: validity and other params

  const serialNumber = parseInt(rootForgeCertificate.serialNumber, 16)
  if (serialNumber !== rootCertificateSerialNumber) {
    differences.serialNumber = {
      valueFromCertificate: serialNumber,
      valueFromParam: rootCertificateSerialNumber,
    }
  }

  return differences
}

const getCertificateRemainingMs = (forgeCertificate) => {
  const { notAfter } = forgeCertificate.validity
  const nowDate = Date.now()
  const remainingMs = nowDate - notAfter
  return remainingMs
}

const getCertificateValidSinceInMs = (forgeCertificate) => {
  const { notBefore } = forgeCertificate.validity
  return Date.now() - notBefore
}

const getCertificateValidityInMs = (forgeCertificate) => {
  const { notBefore, notAfter } = forgeCertificate.validity
  return notAfter - notBefore
}

const fileExistsSync = (fileUrl) => {
  return existsSync(urlToFileSystemPath(fileUrl))
}

const JSENV_CERTIFICATE_AUTHORITY_DIRECTORY_URL = new URL(
  "../certificate_authority",
  import.meta.url,
)
