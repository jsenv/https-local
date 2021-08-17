import { existsSync } from "node:fs"
import { createLogger } from "@jsenv/logger"
import {
  resolveUrl,
  readFile,
  writeFile,
  urlToFileSystemPath,
  assertAndNormalizeFileUrl,
  urlToBasename,
} from "@jsenv/filesystem"

import {
  createValidityDurationOfXYears,
  createValidityDurationOfXDays,
} from "./validity_duration.js"
import { getCertificateAuthorityFileUrls } from "./internal/certificate_authority_file_urls.js"
import { importNodeForge } from "./internal/forge.js"
import {
  attributeDescriptionFromAttributeArray,
  normalizeForgeAltNames,
} from "./internal/certificate_data_converter.js"
import { formatExpired, formatAboutToExpire } from "./internal/validity_formatting.js"
import {
  createCertificateAuthority,
  requestCertificateFromAuthority,
} from "./certificate_generator.js"
import { jsenvVerificationsOnCertificates } from "./jsenvVerificationsOnCertificates.js"

export const requestCertificateForLocalhost = async ({
  logLevel,
  logger = createLogger({ logLevel }), // to be able to catch logs during unit tests

  serverCertificateFileUrl,
  serverCertificateAltNames = [],
  tryToTrustRootCertificate = false,

  // less likely to use the params
  rootCertificateOrganizationName = "jsenv",
  rootCertificateOrganizationalUnitName = "https-localhost",
  rootCertificateCommonName = "https://github.com/jsenv/https-localhost",
  rootCertificateCountryName = "FR",
  rootCertificateStateOrProvinceName = "Alpes Maritimes",
  rootCertificateLocalityName = "Valbonne",
  // even less likely to use params
  rootCertificateValidityDurationInMs = createValidityDurationOfXYears(20),
  rootCertificateSerialNumber = 0,
  serverCertificateOrganizationName = rootCertificateOrganizationName,
  serverCertificateValidityDurationInMs = createValidityDurationOfXDays(396),

  verificationsOnCertificates = jsenvVerificationsOnCertificates,
} = {}) => {
  serverCertificateFileUrl = assertAndNormalizeFileUrl(serverCertificateFileUrl)

  const { certificateAuthorityJsonFileUrl, rootCertificateFileUrl, rootPrivateKeyFileUrl } =
    getCertificateAuthorityFileUrls()

  const rootCertificateFilePath = urlToFileSystemPath(rootCertificateFileUrl)

  const { pki } = await importNodeForge()

  const {
    rootCertificateStatus,
    rootForgeCertificate,
    rootPrivateKey,
    rootCertificatePEM,
    rootPrivateKeyPEM,
  } = await requestRootCertificate({
    logger,
    pki,
    certificateAuthorityJsonFileUrl,
    rootCertificateFileUrl,
    rootPrivateKeyFileUrl,
    rootCertificateOrganizationName,
    rootCertificateOrganizationalUnitName,
    rootCertificateCommonName,
    rootCertificateCountryName,
    rootCertificateStateOrProvinceName,
    rootCertificateLocalityName,
    rootCertificateValidityDurationInMs,
    rootCertificateSerialNumber,
  })

  const { serverCertificateStatus, serverCertificatePEM, serverPrivateKeyPEM } =
    await requestServerCertificate({
      logger,
      pki,
      rootCertificateStatus,
      certificateAuthorityJsonFileUrl,
      rootForgeCertificate,
      rootPrivateKey,
      serverCertificateFileUrl,
      serverCertificateAltNames,
      serverCertificateOrganizationName,
      serverCertificateValidityDurationInMs,
    })

  await verificationsOnCertificates({
    logger,
    rootCertificateStatus,
    rootCertificateFilePath,
    rootCertificate: rootCertificatePEM,
    tryToTrustRootCertificate,

    serverCertificateStatus,
    serverCertificate: serverCertificatePEM,
    serverCertificateAltNames,
  })

  return {
    serverCertificate: serverCertificatePEM,
    serverPrivateKey: serverPrivateKeyPEM,
    rootCertificate: rootCertificatePEM,
    rootPrivateKey: rootPrivateKeyPEM,
  }
}

const requestRootCertificate = async ({
  logger,
  pki,
  certificateAuthorityJsonFileUrl,
  rootCertificateFileUrl,
  rootPrivateKeyFileUrl,
  rootCertificateOrganizationName,
  rootCertificateOrganizationalUnitName,
  rootCertificateCommonName,
  rootCertificateCountryName,
  rootCertificateStateOrProvinceName,
  rootCertificateLocalityName,
  rootCertificateValidityDurationInMs,
  rootCertificateSerialNumber,
}) => {
  const rootCertificateFilePath = urlToFileSystemPath(rootCertificateFileUrl)

  const generateRootCertificateAndFiles = async ({ rootCertificateStatus }) => {
    logger.info(`Generating root certificate files`)
    const { forgeCertificate, privateKey } = await createCertificateAuthority({
      logger,
      // TODO: avoid renaming, keep the long version
      organizationName: rootCertificateOrganizationName,
      organizationalUnitName: rootCertificateOrganizationalUnitName,
      commonName: rootCertificateCommonName,
      countryName: rootCertificateCountryName,
      stateOrProvinceName: rootCertificateStateOrProvinceName,
      localityName: rootCertificateLocalityName,
      validityDurationInMs: rootCertificateValidityDurationInMs,
      serialNumber: rootCertificateSerialNumber,
    })
    const rootCertificatePEM = pki.certificateToPem(forgeCertificate)
    const rootPrivateKeyPEM = pki.privateKeyToPem(privateKey)
    await writeFile(rootCertificateFileUrl, rootCertificatePEM)
    await writeFile(rootPrivateKeyFileUrl, rootPrivateKeyPEM)

    await writeFile(
      certificateAuthorityJsonFileUrl,
      JSON.stringify({ serialNumber: rootCertificateSerialNumber }, null, "  "),
    )

    return {
      rootCertificateStatus,
      rootForgeCertificate: forgeCertificate,
      rootPrivateKey: privateKey,
      rootCertificatePEM,
      rootPrivateKeyPEM,
    }
  }

  if (!fileExistsSync(rootCertificateFileUrl)) {
    logger.debug(`No root certificate file at ${rootCertificateFilePath}`)
    return generateRootCertificateAndFiles({
      rootCertificateStatus: "created",
    })
  }

  logger.debug(`Root certificate file found at ${rootCertificateFilePath}`)
  const rootCertificatePEM = await readFile(rootCertificateFileUrl, { as: "string" })
  const rootForgeCertificate = pki.certificateFromPem(rootCertificatePEM)

  const rootCertificateDifferences = getRootCertificateParamsDiff({
    rootForgeCertificate,
    rootCertificateOrganizationName,
    rootCertificateOrganizationalUnitName,
    rootCertificateCommonName,
    rootCertificateCountryName,
    rootCertificateStateOrProvinceName,
    rootCertificateLocalityName,
    rootCertificateValidityDurationInMs,
    rootCertificateSerialNumber,
  })
  if (rootCertificateDifferences.length) {
    const paramNames = Object.keys(rootCertificateDifferences)
    logger.debug(`Root certificate params have changed: ${paramNames}`)
    return generateRootCertificateAndFiles({
      rootCertificateStatus: "updated",
    })
  }

  logger.debug(`Checking root certificate validity`)
  const validityRemainingMs = getCertificateRemainingMs(rootForgeCertificate)
  if (validityRemainingMs < 0) {
    const msEllapsedSinceValid = getCertificateValidSinceInMs(rootForgeCertificate)
    const msEllapsedSinceExpiration = -validityRemainingMs
    logger.info(
      formatExpired({
        certificateName: "root certificate",
        msEllapsedSinceExpiration,
        msEllapsedSinceValid,
      }),
    )
    return generateRootCertificateAndFiles({
      rootCertificateStatus: "updated",
    })
  }
  const validityDurationInMs = getCertificateValidityInMs(rootForgeCertificate)
  const validityRemainingMsRatio = validityDurationInMs / validityRemainingMs
  if (validityRemainingMsRatio < 0.05) {
    const msEllapsedSinceValid = getCertificateValidSinceInMs(rootForgeCertificate)
    logger.info(
      formatAboutToExpire({
        certificateName: "root certificate",
        validityRemainingMs,
        msEllapsedSinceValid,
      }),
    )
    return generateRootCertificateAndFiles({
      rootCertificateStatus: "updated",
    })
  }
  logger.debug(`Root certificate is valid`)

  logger.debug(`Read root certificate private key at ${rootPrivateKeyFileUrl}`)
  const rootPrivateKeyPEM = await readFile(rootPrivateKeyFileUrl, {
    as: "string",
  })
  const rootPrivateKey = pki.privateKeyFromPem(rootPrivateKeyPEM)
  logger.debug(`Private key file found, reusing root certificate from filesystem`)

  return {
    rootCertificateStatus: "reused",
    rootForgeCertificate,
    rootPrivateKey,
    rootCertificatePEM,
    rootPrivateKeyPEM,
  }
}

const requestServerCertificate = async ({
  logger,
  pki,
  rootCertificateStatus,
  certificateAuthorityJsonFileUrl,
  rootForgeCertificate,
  rootPrivateKey,
  serverCertificateFileUrl,
  serverCertificateAltNames,
  serverCertificateOrganizationName,
  serverCertificateValidityDurationInMs,
}) => {
  const serverCertificateFilePath = urlToFileSystemPath(serverCertificateFileUrl)
  const serverCertificateDirectoryUrl = new URL("./", serverCertificateFileUrl)
  const serverPrivateKeyFileUrl = resolveUrl(
    `${urlToBasename(serverCertificateFileUrl)}.key`,
    serverCertificateDirectoryUrl,
  )

  const generateServerCertificateAndFiles = async ({ serverCertificateStatus }) => {
    logger.info(`Generating server certificate files`)
    const certificateAuthorityJSON = await readFile(certificateAuthorityJsonFileUrl, { as: "json" })
    const lastSerialNumber = certificateAuthorityJSON.serialNumber
    await writeFile(
      certificateAuthorityJsonFileUrl,
      JSON.stringify(
        {
          ...certificateAuthorityJsonFileUrl,
          // serial management https://datatracker.ietf.org/doc/html/rfc5280#section-4.1.2.2
          serialNumber: lastSerialNumber + 1,
        },
        null,
        "  ",
      ),
    )
    const serverCertificate = await requestCertificateFromAuthority({
      logger,
      certificateAuthority: {
        forgeCertificate: rootForgeCertificate,
        privateKey: rootPrivateKey,
      },
      // TODO: avoid renaming, keep the long version
      altNames: serverCertificateAltNames,
      organizationName: serverCertificateOrganizationName,
      validityDurationInMs: serverCertificateValidityDurationInMs,
      serialNumber: lastSerialNumber + 1,
    })
    const serverCertificatePEM = pki.certificateToPem(serverCertificate.forgeCertificate)
    const serverPrivateKeyPEM = pki.privateKeyToPem(serverCertificate.privateKey)
    await writeFile(serverCertificateFileUrl, serverCertificatePEM)
    await writeFile(serverPrivateKeyFileUrl, serverPrivateKeyPEM)

    return {
      serverCertificateStatus,
      serverCertificatePEM,
      serverPrivateKeyPEM,
    }
  }

  if (!fileExistsSync(serverCertificateFileUrl)) {
    logger.debug(`No server certificate file at ${serverCertificateFilePath}`)
    return generateServerCertificateAndFiles({
      serverCertificateStatus: "created",
    })
  }
  if (rootCertificateStatus !== "reused") {
    logger.debug(
      `Ignoring server certificate at ${serverCertificateFilePath} because it was issued with an other root certificate`,
    )
    return generateServerCertificateAndFiles({
      serverCertificateStatus: "created",
    })
  }
  logger.debug(`Server certificate file found at ${serverCertificateFilePath}`)

  const serverCertificatePEM = await readFile(serverCertificateFileUrl, { as: "string" })
  const serverForgeCertificate = pki.certificateFromPem(serverCertificatePEM)

  const serverCertificateDifferences = getServerCertificateParamsDiff({
    serverForgeCertificate,
    serverCertificateAltNames,
    serverCertificateOrganizationName,
    serverCertificateValidityDurationInMs,
  })
  if (serverCertificateDifferences.length) {
    const paramNames = Object.keys(serverCertificateDifferences)
    logger.debug(`Server certificate params have changed: ${paramNames}`)
    return generateServerCertificateAndFiles({
      serverCertificateStatus: "updated",
    })
  }

  logger.debug(`Checking server certificate validity`)
  const validityRemainingMs = getCertificateRemainingMs(serverForgeCertificate)
  if (validityRemainingMs < 0) {
    const msEllapsedSinceValid = getCertificateValidSinceInMs(serverForgeCertificate)
    const msEllapsedSinceExpiration = -validityRemainingMs
    logger.info(
      formatExpired({
        certificateName: "server certificate",
        msEllapsedSinceExpiration,
        msEllapsedSinceValid,
      }),
    )
    return generateServerCertificateAndFiles({
      serverCertificateStatus: "updated",
    })
  }
  const validityDurationInMs = getCertificateValidityInMs(serverForgeCertificate)
  const validityRemainingMsRatio = validityDurationInMs / validityRemainingMs
  if (validityRemainingMsRatio < 0.05) {
    const msEllapsedSinceValid = getCertificateValidSinceInMs(serverForgeCertificate)
    logger.info(
      formatAboutToExpire({
        certificateName: "server certificate",
        validityRemainingMs,
        msEllapsedSinceValid,
      }),
    )
    return generateServerCertificateAndFiles({
      serverCertificateStatus: "updated",
    })
  }
  logger.debug(`Server certificate is valid`)

  logger.debug(`Read server certificate private key at ${serverPrivateKeyFileUrl}`)
  const serverPrivateKeyPEM = await readFile(serverPrivateKeyFileUrl, {
    as: "string",
  })
  logger.debug(`Private key file found, reusing server certificate from filesystem`)

  return {
    serverCertificateStatus: "reused",
    serverCertificatePEM,
    serverPrivateKeyPEM,
  }
}

const getRootCertificateParamsDiff = ({
  rootForgeCertificate,
  rootCertificateOrganizationName,
  rootCertificateOrganizationalUnitName,
  rootCertificateCommonName,
  rootCertificateCountryName,
  rootCertificateStateOrProvinceName,
  rootCertificateLocalityName,
  rootCertificateValidityDurationInMs,
  rootCertificateSerialNumber,
}) => {
  const attributeDescription = attributeDescriptionFromAttributeArray(
    rootForgeCertificate.subject.attributes,
  )
  const differences = {}

  const { organizationName } = attributeDescription
  if (organizationName !== rootCertificateOrganizationName) {
    differences.rootCertificateOrganizationName = {
      valueFromCertificate: organizationName,
      valueFromParam: rootCertificateOrganizationName,
    }
  }

  const { organizationalUnitName } = attributeDescription
  if (organizationalUnitName !== rootCertificateOrganizationalUnitName) {
    differences.rootCertificateOrganizationalUnitName = {
      valueFromCertificate: organizationalUnitName,
      valueFromParam: rootCertificateOrganizationalUnitName,
    }
  }

  const { commonName } = attributeDescription
  if (commonName !== rootCertificateCommonName) {
    differences.rootCertificateCommonName = {
      valueFromCertificate: commonName,
      valueFromParam: rootCertificateCommonName,
    }
  }

  const { countryName } = attributeDescription
  if (countryName !== rootCertificateCountryName) {
    differences.rootCertificateCountryName = {
      valueFromCertificate: countryName,
      valueFromParam: rootCertificateCountryName,
    }
  }

  const { localityName } = attributeDescription
  if (localityName !== rootCertificateLocalityName) {
    differences.rootCertificateLocalityName = {
      valueFromCertificate: localityName,
      valueFromParam: rootCertificateLocalityName,
    }
  }

  const { stateOrProvinceName } = attributeDescription
  if (stateOrProvinceName !== rootCertificateStateOrProvinceName) {
    differences.rootCertificateStateOrProvinceName = {
      valueFromCertificate: stateOrProvinceName,
      valueFromParam: rootCertificateStateOrProvinceName,
    }
  }

  const { notBefore, notAfter } = rootForgeCertificate.validity
  const forgeCertificateValidityDurationInMs = notAfter - notBefore
  // it's certainly too precise, we should approximate to a second? more?
  if (forgeCertificateValidityDurationInMs !== rootCertificateValidityDurationInMs) {
    differences.rootCertificateValidityInYears = {
      valueFromCertificate: forgeCertificateValidityDurationInMs,
      valueFromParam: rootCertificateValidityDurationInMs,
    }
  }

  const serialNumber = parseInt(rootForgeCertificate.serialNumber, 16)
  if (serialNumber !== rootCertificateSerialNumber) {
    differences.rootCertificateSerialNumber = {
      valueFromCertificate: serialNumber,
      valueFromParam: rootCertificateSerialNumber,
    }
  }

  return differences
}

const getServerCertificateParamsDiff = ({
  serverForgeCertificate,
  serverCertificateAltNames,
  serverCertificateOrganizationName,
  serverCertificateValidityDurationInMs,
}) => {
  const differences = {}
  const attributeDescription = attributeDescriptionFromAttributeArray(
    serverForgeCertificate.subject.attributes,
  )

  const altNames = normalizeForgeAltNames(attributeDescription.altNames)
  if (altNames.sort().join("") !== serverCertificateAltNames.sort().join("")) {
    differences.serverCertificateAltNames = {
      valueFromCertificate: altNames,
      valueFromParam: serverCertificateAltNames,
    }
  }

  const { organizationName } = attributeDescription
  if (organizationName !== serverCertificateOrganizationName) {
    differences.serverCertificateOrganizationName = {
      valueFromCertificate: organizationName,
      valueFromParam: serverCertificateOrganizationName,
    }
  }

  const { notBefore, notAfter } = serverForgeCertificate.validity
  const forgeCertificateValidityDurationInMs = notAfter - notBefore
  // it's certainly too precise, we should approximate to a second? more?
  if (forgeCertificateValidityDurationInMs !== serverCertificateValidityDurationInMs) {
    differences.serverCertificateValidityDurationInMs = {
      valueFromCertificate: forgeCertificateValidityDurationInMs,
      valueFromParam: serverCertificateValidityDurationInMs,
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
