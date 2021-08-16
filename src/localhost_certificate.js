import { existsSync } from "node:fs"
import { createLogger } from "@jsenv/logger"
import {
  resolveUrl,
  readFile,
  writeFile,
  urlToFileSystemPath,
  assertAndNormalizeFileUrl,
  urlToBasename,
  removeFileSystemNode,
} from "@jsenv/filesystem"

import { importNodeForge } from "./internal/forge.js"
import {
  attributeDescriptionFromAttributeArray,
  normalizeForgeAltNames,
} from "./internal/certificate_data_converter.js"
import { formatExpired, formatAboutToExpire } from "./internal/validity_formatting.js"
import { platformTrustStore } from "./internal/platform_trust_store.js"
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
  // rootCertificateAutoTrust = false,
  // checkIfCertificateIsTrusted = true,
  // user less likely to use the params below
  serverCertificateOrganizationName = rootCertificateOrganizationName,

  shouldTrustNewRootCertificate = async ({ rootCertificateFilePath, rootCertificatePEM }) => {
    logger.info(`${rootCertificateFilePath} root certificate needs to be trusted`)

    const howToRegisterRootCertificate = await platformTrustStore.getHowToRegisterRootCertificate({
      logger,
      rootCertificateFilePath,
      rootCertificatePEM,
    })
    // on voudrait presque aussi un browser + node etc whatever trust store pour chaque plateforme
    // comme ce serais ingérable il faut pouvoir appliquer le comportement par défaut
    // mais aussi le comportement custom
    // et pouvoir avoir des truc automatique (genre eslint -fix) et des trucs manuel
    // genre lire la doc et le faire soi meme
  },
  shouldTrustUpdatedRootCertificate = ({ rootCertificateFilePath }) => {
    logger.info(`${rootCertificateFilePath} root certificate has changed it needs to be re-trusted`)
    // user must untrust the existing certificate then add it back
  },
  onRootCertificateReused = () => {},
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
    rootCertificateSerialNumber,
  })

  if (rootCertificateStatus === "created") {
    await shouldTrustNewRootCertificate({
      rootCertificateFilePath,
      rootCertificatePEM,
    })
  } else if (rootCertificateStatus === "updated") {
    await shouldTrustUpdatedRootCertificate({
      rootCertificateFilePath,
      rootCertificatePEM,
    })
  } else if (rootCertificateStatus === "reused") {
    // Is it possible to check if the root certificate is trusted at this stage?
    // If yes we should and provide that info in onRootCertificateReused
    // otherwise see if possible to check if server certificate is trusted
    // and if so perform the check at that moment
    await onRootCertificateReused({
      rootCertificateFilePath,
    })
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
    })

  if (serverCertificateStatus === "created") {
    // when serverCertificateAltNames is used
    // we should also tell user what to do:
    // -> add some line into etc/hosts
    // here again take inspiration from
    // devcert but without running the command
    // let the user do it
  }

  return {
    serverCertificate: serverCertificatePEM,
    serverPrivateKey: serverPrivateKeyPEM,
    rootCertificate: rootCertificatePEM,
    rootPrivateKey: rootPrivateKeyPEM,
  }
}

const getCertificateAuthorityFileUrls = () => {
  const certificateAuthorityJsonFileUrl = new URL(
    "./jsenv_certificate_authority.json",
    JSENV_CERTIFICATE_AUTHORITY_DIRECTORY_URL,
  )

  const rootCertificateFileUrl = new URL(
    "./jsenv_certificate_authority.crt",
    JSENV_CERTIFICATE_AUTHORITY_DIRECTORY_URL,
  )

  const rootPrivateKeyFileUrl = resolveUrl(
    "./jsenv_certificate_authority.key",
    JSENV_CERTIFICATE_AUTHORITY_DIRECTORY_URL,
  )

  return {
    certificateAuthorityJsonFileUrl,
    rootCertificateFileUrl,
    rootPrivateKeyFileUrl,
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
  rootCertificateSerialNumber,
}) => {
  const rootCertificateFilePath = urlToFileSystemPath(rootCertificateFileUrl)

  const generateRootCertificateAndFiles = async ({ rootCertificateStatus }) => {
    logger.info(`Generating root certificate files`)
    const { forgeCertificate, privateKey } = await createCertificateAuthority({
      organizationName: rootCertificateOrganizationName,
      organizationalUnitName: rootCertificateOrganizationalUnitName,
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
  serverOrganizationName,
  serverCertificateAltNames,
  serverCertificateOrganizationName,
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
      altNames: serverCertificateAltNames,
      organizationName: serverCertificateOrganizationName,
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
    serverOrganizationName,
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

  // TODO: validity and other params

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
  serverOrganizationName,
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
  if (organizationName !== serverOrganizationName) {
    differences.serverOrganizationName = {
      valueFromCertificate: organizationName,
      valueFromParam: serverOrganizationName,
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
  "../certificate_authority/",
  import.meta.url,
)

export const resetCertificateAuhtorityFiles = async () => {
  const { certificateAuthorityJsonFileUrl, rootCertificateFileUrl, rootPrivateKeyFileUrl } =
    getCertificateAuthorityFileUrls()

  await writeFile(certificateAuthorityJsonFileUrl, `{}`)
  await removeFileSystemNode(rootCertificateFileUrl, { allowUseless: true })
  await removeFileSystemNode(rootPrivateKeyFileUrl, { allowUseless: true })
}
