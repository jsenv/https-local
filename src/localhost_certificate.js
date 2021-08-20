import { existsSync } from "node:fs"
import { createLogger } from "@jsenv/logger"
import {
  resolveUrl,
  readFile,
  writeFile,
  urlToFileSystemPath,
  assertAndNormalizeFileUrl,
  urlToBasename,
  writeSymbolicLink,
} from "@jsenv/filesystem"

import {
  createValidityDurationOfXYears,
  createValidityDurationOfXDays,
} from "./validity_duration.js"
import {
  getCertificateAuthorityFileUrls,
  getRootCertificateSymlinkUrls,
} from "./internal/certificate_authority_file_urls.js"
import { importNodeForge } from "./internal/forge.js"
import {
  attributeDescriptionFromAttributeArray,
  normalizeForgeAltNames,
} from "./internal/certificate_data_converter.js"
import {
  formatExpired,
  formatAboutToExpire,
  formatStillValid,
} from "./internal/validity_formatting.js"
import {
  createCertificateAuthority,
  requestCertificateFromAuthority,
} from "./internal/certificate_generator.js"
import { jsenvVerificationsOnCertificates } from "./internal/jsenvVerificationsOnCertificates.js"

// const jsenvCertificateParams = {
//   rootCertificateOrganizationName: "jsenv",
//   rootCertificateOrganizationalUnitName: "https-localhost",
//   rootCertificateCountryName: "FR",
//   rootCertificateStateOrProvinceName: "Alpes Maritimes",
//   rootCertificateLocalityName: "Valbonne",
// }

const isWindows = process.platform === "win32"

export const requestCertificateForLocalhost = async ({
  logLevel,
  logger = createLogger({ logLevel }), // to be able to catch logs during unit tests

  serverCertificateFileUrl,
  serverCertificateAltNames = [],

  certificateTrustVerification = true,
  tryToTrustRootCertificate = false,

  certificateHostnamesVerification = true,
  tryToRegisterHostnames = false,

  // less likely to use the params
  rootCertificateCommonName = "Jsenv localhost root certificate",
  rootCertificateOrganizationName,
  rootCertificateOrganizationalUnitName,
  rootCertificateCountryName,
  rootCertificateStateOrProvinceName,
  rootCertificateLocalityName,
  // even less likely to use params
  rootCertificateValidityDurationInMs = createValidityDurationOfXYears(20),
  rootCertificateSerialNumber = 0,
  serverCertificateCommonName = "Jsenv localhost server certificate", // rootCertificateCommonName
  serverCertificateOrganizationName, // = rootCertificateOrganizationName,
  serverCertificateValidityDurationInMs = createValidityDurationOfXDays(396),

  verificationsOnCertificates = jsenvVerificationsOnCertificates,
  // almost only for unit test
  aboutToExpireRatio = 0.05,
  hostsFilePath,
} = {}) => {
  serverCertificateFileUrl = assertAndNormalizeFileUrl(serverCertificateFileUrl)
  const { certificateAuthorityJsonFileUrl, rootCertificateFileUrl, rootPrivateKeyFileUrl } =
    getCertificateAuthorityFileUrls()
  const { rootCertificateSymlinkUrl, rootPrivateKeySymlinkUrl } = getRootCertificateSymlinkUrls({
    rootCertificateFileUrl,
    rootPrivateKeyFileUrl,
    serverCertificateFileUrl,
  })

  serverCertificateAltNames = ["localhost", "*.localhost", ...serverCertificateAltNames]

  logger.debug(
    `Certificate requested for localhost, certificateTrustVerification: ${certificateTrustVerification}, certificateHostnamesVerification: ${certificateHostnamesVerification}`,
  )

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
    rootCertificateCommonName,
    rootCertificateOrganizationName,
    rootCertificateOrganizationalUnitName,
    rootCertificateCountryName,
    rootCertificateStateOrProvinceName,
    rootCertificateLocalityName,
    rootCertificateValidityDurationInMs,
    rootCertificateSerialNumber,
    aboutToExpireRatio,
  })

  /*
   * The root certificate files can be "hard" to find because
   * located in a dedicated application directory specific to the OS
   * To make them easier to find, we write symbolic links near the server
   * certificate file pointing to the root certificate files
   */
  if (!isWindows) {
    logger.debug(`Writing root certificate symbol link files`)
    await writeSymbolicLink({
      from: rootCertificateSymlinkUrl,
      to: rootCertificateFileUrl,
      type: "file",
      allowUseless: true,
      allowOverwrite: true,
    })
    await writeSymbolicLink({
      from: rootPrivateKeySymlinkUrl,
      to: rootPrivateKeyFileUrl,
      type: "file",
      allowUseless: true,
      allowOverwrite: true,
    })
    logger.debug(`Root certificate symbolic links written`)
  }

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
      serverCertificateCommonName,
      serverCertificateValidityDurationInMs,
      aboutToExpireRatio,
    })

  await verificationsOnCertificates({
    logger,
    rootCertificateStatus,
    rootCertificateFileUrl,
    rootCertificateSymlinkUrl,
    rootCertificatePEM,

    certificateTrustVerification,
    tryToTrustRootCertificate,

    certificateHostnamesVerification,
    tryToRegisterHostnames,
    hostsFilePath,

    serverCertificateStatus,
    serverCertificateFileUrl,
    serverCertificatePEM,
    serverCertificateAltNames,
  })

  return {
    serverCertificate: serverCertificatePEM,
    serverPrivateKey: serverPrivateKeyPEM,
    rootCertificate: rootCertificatePEM,
    rootPrivateKey: rootPrivateKeyPEM,
    rootCertificateFilePath: urlToFileSystemPath(rootCertificateFileUrl),
  }
}

const requestRootCertificate = async ({
  logger,
  pki,
  certificateAuthorityJsonFileUrl,
  rootCertificateFileUrl,
  rootPrivateKeyFileUrl,
  rootCertificateCommonName,
  rootCertificateOrganizationName,
  rootCertificateOrganizationalUnitName,
  rootCertificateCountryName,
  rootCertificateStateOrProvinceName,
  rootCertificateLocalityName,
  rootCertificateValidityDurationInMs,
  rootCertificateSerialNumber,
  aboutToExpireRatio,
}) => {
  const rootCertificateFilePath = urlToFileSystemPath(rootCertificateFileUrl)

  const generateRootCertificateAndFiles = async ({ rootCertificateStatus }) => {
    logger.info(`Generating root certificate files`)
    const { forgeCertificate, privateKey } = await createCertificateAuthority({
      logger,
      // TODO: avoid renaming, keep the long version
      commonName: rootCertificateCommonName,
      organizationName: rootCertificateOrganizationName,
      organizationalUnitName: rootCertificateOrganizationalUnitName,
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
    rootCertificateCommonName,
    rootCertificateOrganizationName,
    rootCertificateOrganizationalUnitName,
    rootCertificateCountryName,
    rootCertificateStateOrProvinceName,
    rootCertificateLocalityName,
    rootCertificateValidityDurationInMs,
    rootCertificateSerialNumber,
  })
  if (rootCertificateDifferences.length) {
    const paramNames = Object.keys(rootCertificateDifferences)
    logger.debug(`root certificate params have changed: ${paramNames}`)
    return generateRootCertificateAndFiles({
      rootCertificateStatus: "updated",
    })
  }

  logger.debug(`Checking root certificate validity`)
  const validityRemainingMs = getCertificateRemainingMs(rootForgeCertificate)
  if (validityRemainingMs < 0) {
    const msEllapsedSinceExpiration = -validityRemainingMs
    logger.info(
      formatExpired({
        certificateName: "root certificate",
        msEllapsedSinceExpiration,
        certificateValidityDurationInMs: rootCertificateValidityDurationInMs,
      }),
    )
    return generateRootCertificateAndFiles({
      rootCertificateStatus: "updated",
    })
  }
  const validityRemainingMsRatio = validityRemainingMs / rootCertificateValidityDurationInMs
  if (validityRemainingMsRatio < aboutToExpireRatio) {
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
  logger.debug(
    formatStillValid({
      certificateName: "root certificate",
      validityRemainingMs,
    }),
  )

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
  serverCertificateCommonName,
  serverCertificateOrganizationName,
  serverCertificateValidityDurationInMs,
  aboutToExpireRatio,
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
      commonName: serverCertificateCommonName,
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
    serverCertificateCommonName,
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
    const msEllapsedSinceExpiration = -validityRemainingMs
    logger.info(
      formatExpired({
        certificateName: "server certificate",
        msEllapsedSinceExpiration,
        certificateValidityDurationInMs: serverCertificateValidityDurationInMs,
      }),
    )
    return generateServerCertificateAndFiles({
      serverCertificateStatus: "updated",
    })
  }

  const validityRemainingMsRatio = validityRemainingMs / serverCertificateValidityDurationInMs
  if (validityRemainingMsRatio < aboutToExpireRatio) {
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
  logger.debug(
    formatStillValid({
      certificateName: "server certificate",
      validityRemainingMs,
    }),
  )

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
  rootCertificateCommonName,
  rootCertificateOrganizationName,
  rootCertificateOrganizationalUnitName,
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

  const { commonName } = attributeDescription
  if (commonName !== rootCertificateCommonName) {
    differences.rootCertificateCommonName = {
      valueFromCertificate: commonName,
      valueFromParam: rootCertificateCommonName,
    }
  }

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
  serverCertificateCommonName,
  serverCertificateOrganizationName,
  serverCertificateValidityDurationInMs,
}) => {
  const differences = {}
  const attributeDescription = attributeDescriptionFromAttributeArray(
    serverForgeCertificate.subject.attributes,
  )

  const altNames = normalizeForgeAltNames(attributeDescription.altNames || [])
  if (altNames.sort().join("") !== serverCertificateAltNames.sort().join("")) {
    differences.serverCertificateAltNames = {
      valueFromCertificate: altNames,
      valueFromParam: serverCertificateAltNames,
    }
  }

  const { commonName } = attributeDescription
  if (commonName !== serverCertificateCommonName) {
    differences.serverCertificateCommonName = {
      valueFromCertificate: commonName,
      valueFromParam: serverCertificateCommonName,
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
  const remainingMs = notAfter - nowDate
  return remainingMs
}

const getCertificateValidSinceInMs = (forgeCertificate) => {
  const { notBefore } = forgeCertificate.validity
  return Date.now() - notBefore
}

const fileExistsSync = (fileUrl) => {
  return existsSync(urlToFileSystemPath(fileUrl))
}
