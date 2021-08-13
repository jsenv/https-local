import { existsSync } from "node:fs"
import { createDetailedMessage, createLogger } from "@jsenv/logger"
import {
  resolveUrl,
  readFile,
  writeFile,
  urlToFileSystemPath,
  assertAndNormalizeDirectoryUrl,
  urlToBasename,
} from "@jsenv/util"

import { importNodeForge } from "./internal/forge.js"
import {
  formatExpiredSinceDuration,
  formatExpiresInDuration,
} from "./internal/expiration_formatting.js"
import {
  createCertificateAuthority,
  requestCertificateFromAuthority,
} from "./certificate_generator.js"

// serial management https://datatracker.ietf.org/doc/html/rfc5280#section-4.1.2.2

export const requestCertificateForLocalhost = async ({
  logLevel,
  certificatesDirectory,
  rootCertificateFilename = "jsenv_localhost_root_certificate.crt",
  serverCertificateFilename = "jsenv_localhost_server_certificate.crt",
  rootCertificateSerialNumber = 0,
  rootCertificateOrganizationName = "jsenv",
  rootCertificateOrganizationalUnitName = "https-localhost",
  serverCertificateAltNames = [],
  rootCertificateAutoTrust = false,
  // user less likely to use the params below
  serverCertificateOrganizationName = rootCertificateOrganizationName,
} = {}) => {
  const certificatesDirectoryUrl = assertAndNormalizeDirectoryUrl(certificatesDirectory)
  if (typeof rootCertificateFilename !== "string") {
    throw new TypeError(
      `rootCertificateFilename must be a string but received ${rootCertificateFilename}`,
    )
  }
  if (typeof serverCertificateFilename !== "string") {
    throw new TypeError(
      `serverCertificateFilename must be a string but received ${serverCertificateFilename}`,
    )
  }

  const logger = createLogger({ logLevel })

  const onRootCertificateCreated = () => {
    // user must trust this new certificate
    // import { platformTrustStore } from "./platform_trust_store.js"
  }

  const onRootCertificateUpdated = () => {
    // user must untrust the existing certificate then add it back
    // if (rootCertificateAutoTrust) {
    //   await platformTrustStore.registerRootCertificateFile({
    //     certificateFileUrl: rootCertificateFileUrl,
    //   })
    // }
  }

  const onRootCertificateReused = () => {
    // nothing to do, certificate was reused
  }

  const { pki } = await importNodeForge()

  const normalizeReturnValue = ({ certificateAuthority, serverCertificate }) => {
    return {
      rootCertificate: pki.certificateToPem(certificateAuthority.forgeCertificate),
      rootCertificatePrivateKey: pki.privateKeyToPem(certificateAuthority.privateKey),
      serverCertificate: pki.certificateToPem(serverCertificate.forgeCertificate),
      serverPrivateKey: pki.privateKeyToPem(serverCertificate.privateKey),
    }
  }

  const authorityDataFileUrl = resolveUrl(`certificates_data.json`, certificatesDirectoryUrl)
  const rootCertificateFileUrl = resolveUrl(rootCertificateFilename, certificatesDirectoryUrl)
  const rootPrivateKeyFileUrl = resolveUrl(
    `${urlToBasename(rootCertificateFileUrl)}.key`,
    certificatesDirectoryUrl,
  )

  let authorityData
  const generateCertificateAuthorityAndFiles = async () => {
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
      authorityDataFileUrl,
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

  if (!fileExistsSync(authorityDataFileUrl)) {
    logger.info(`Generating a root certificate because no existing certificate found`)
    const certificateAuthority = await generateCertificateAuthorityAndFiles()
    await onRootCertificateCreated()
    return createOrReuseServerCertificate({ certificateAuthority })
  }

  logger.debug(`Certificate authority data file found at ${authorityDataFileUrl}`)
  authorityData = await readFile(authorityDataFileUrl, { as: "json" })

  const rootCertificateDifferences = getRootCertificateParamsDiff({
    rootCertificateParamsPrevious: authorityData.rootCertificateParams,
    rootCertificateParams: {
      certificateFileName: rootCertificateFilename,
      serialNumber: rootCertificateSerialNumber,
      organizationName: rootCertificateOrganizationName,
      organizationalUnitName: rootCertificateOrganizationalUnitName,
    },
  })
  if (rootCertificateDifferences.length) {
    const paramNames = Object.keys(rootCertificateDifferences)
    logger.info(
      `Generating a new root certificate because the existing ${paramNames} are different`,
    )
    const certificateAuthority = await generateCertificateAuthorityAndFiles()
    await onRootCertificateUpdated()
    return createOrReuseServerCertificate({ certificateAuthority })
  }

  logger.debug(`Reading root certificate at ${rootCertificateFileUrl}`)
  const rootCertificatePem = await readFile(rootCertificateFileUrl, { as: "string" })
  const forgeCertificate = pki.certificateFromPem(rootCertificatePem)

  logger.debug(`Checking root certificate validity`)
  const validityRemainingMs = getCertificateRemainingMs(forgeCertificate)
  if (validityRemainingMs < 0) {
    const msEllapsedSinceExpiration = -validityRemainingMs
    logger.info(
      `Generating a new root certificate because the existing is expired since ${formatExpiredSinceDuration(
        msEllapsedSinceExpiration,
      )}`,
    )
    const certificateAuthority = await generateCertificateAuthorityAndFiles()
    await onRootCertificateUpdated()
    return createOrReuseServerCertificate({ certificateAuthority })
  }

  const validityDurationInMs = getCertificateValidityInMs(forgeCertificate)
  const validityRemainingMsRatio = validityDurationInMs / validityRemainingMs
  if (validityRemainingMsRatio < 0.05) {
    logger.info(
      `Generating a new root certificate because the existing expires in ${formatExpiresInDuration(
        validityRemainingMs,
      )}`,
    )
    const certificateAuthority = await generateCertificateAuthorityAndFiles()
    await onRootCertificateUpdated()

    // TODO: generate a server cert
    return
  }
  logger.debug(`Root certificate is valid`)

  logger.debug(`Read private key for root certificate at ${rootPrivateKeyFileUrl}`)
  const rootCertificatePrivateKeyPem = await readFile(rootPrivateKeyFileUrl, {
    as: "string",
  })
  const privateKey = pki.privateKeyFromPem(rootCertificatePrivateKeyPem)
  logger.debug(`Reusing root certificate found on filesystem`)

  const certificateAuthority = {
    forgeCertificate,
    privateKey,
  }
  await onRootCertificateReused()
  return createOrReuseServerCertificate({ certificateAuthority })
}

const getRootCertificateParamsDiff = ({ rootCertificateParamsPrevious, rootCertificateParams }) => {
  const differences = {}

  if (rootCertificateParamsPrevious.serialNumber !== rootCertificateParams.serialNumber) {
    differences.serialNumber = true
  }

  if (rootCertificateParamsPrevious.organizationName !== rootCertificateParams.organizationName) {
    differences.organizationName = true
  }

  if (
    rootCertificateParamsPrevious.organizationalUnitName !==
    rootCertificateParams.organizationalUnitName
  ) {
    differences.organizationalUnitName = true
  }

  return differences
}

const getCertificateRemainingMs = (forgeCertificate) => {
  const { notAfter } = forgeCertificate.validity
  const nowDate = Date.now()
  const remainingMs = nowDate - notAfter
  return remainingMs
}

const getCertificateValidityInMs = (forgeCertificate) => {
  const { notBefore, notAfter } = forgeCertificate.validity
  return notAfter - notBefore
}

const fileExistsSync = (fileUrl) => {
  return existsSync(urlToFileSystemPath(fileUrl))
}
