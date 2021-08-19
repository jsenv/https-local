// https://github.com/digitalbazaar/forge/blob/master/examples/create-cert.js
// https://github.com/digitalbazaar/forge/issues/660#issuecomment-467145103

import { createDetailedMessage } from "@jsenv/logger"

import { verifyRootCertificateValidityDuration } from "../validity_duration.js"
import { importNodeForge } from "./forge.js"
import {
  attributeArrayFromAttributeDescription,
  attributeDescriptionFromAttributeArray,
  subjectAltNamesFromAltNames,
  extensionArrayFromExtensionDescription,
} from "./certificate_data_converter.js"

export const createCertificateAuthority = async ({
  logger,
  commonName,
  countryName,
  stateOrProvinceName,
  localityName,
  organizationName,
  organizationalUnitName,
  validityDurationInMs,
  serialNumber,
} = {}) => {
  if (typeof serialNumber !== "number") {
    throw new TypeError(`serial must be a number but received ${serialNumber}`)
  }

  if (typeof validityDurationInMs !== "number") {
    throw new TypeError(
      `validityDurationInMs must be a number but received ${validityDurationInMs}`,
    )
  }
  if (validityDurationInMs < 1) {
    throw new TypeError(`validityDurationInMs must be > 0 but received ${validityDurationInMs}`)
  }
  const rootCertificateValidityDuration =
    verifyRootCertificateValidityDuration(validityDurationInMs)
  if (!rootCertificateValidityDuration.ok) {
    validityDurationInMs = rootCertificateValidityDuration.maxAllowedValue
    logger.warn(
      createDetailedMessage(rootCertificateValidityDuration.message, {
        details: rootCertificateValidityDuration.details,
      }),
    )
  }

  const forge = await importNodeForge()
  const { pki } = forge
  const forgeCertificate = pki.createCertificate()
  const { privateKey, publicKey } = pki.rsa.generateKeyPair(2048)

  forgeCertificate.publicKey = publicKey
  forgeCertificate.serialNumber = serialNumber.toString(16)
  forgeCertificate.validity.notBefore = new Date()
  forgeCertificate.validity.notAfter = new Date(Date.now() + validityDurationInMs)

  forgeCertificate.setSubject(
    attributeArrayFromAttributeDescription({
      commonName,
      countryName,
      stateOrProvinceName,
      localityName,
      organizationName,
      organizationalUnitName,
    }),
  )
  forgeCertificate.setIssuer(
    attributeArrayFromAttributeDescription({
      commonName,
      countryName,
      stateOrProvinceName,
      localityName,
      organizationName,
      organizationalUnitName,
    }),
  )
  forgeCertificate.setExtensions(
    extensionArrayFromExtensionDescription({
      basicConstraints: {
        critical: true,
        cA: true,
      },
      keyUsage: {
        critical: true,
        digitalSignature: true,
        keyCertSign: true,
        cRLSign: true,
      },
      // extKeyUsage: {
      //   serverAuth: true,
      //   clientAuth: true,
      // },
      // subjectKeyIdentifier: {},
    }),
  )

  // self-sign certificate
  forgeCertificate.sign(privateKey, forge.sha256.create())

  return {
    forgeCertificate,
    publicKey,
    privateKey,
  }
}

export const requestCertificateFromAuthority = async ({
  logger,
  certificateAuthority,
  altNames = [],
  commonName,
  organizationName,
  validityDurationInMs,
  serialNumber,
}) => {
  if (typeof certificateAuthority !== "object" || certificateAuthority === null) {
    throw new TypeError(
      `certificateAuthority must be an object but received ${certificateAuthority}`,
    )
  }
  const { forgeCertificate: authorityForgeCertificate } = certificateAuthority
  if (typeof authorityForgeCertificate !== "object") {
    throw new TypeError(
      `certificateAuthority.forgeCertificate must be an object but received ${authorityForgeCertificate}`,
    )
  }
  const { privateKey: authorityPrivateKey } = certificateAuthority
  if (typeof authorityPrivateKey !== "object" || authorityPrivateKey === null) {
    throw new TypeError(
      `certificateAuthority.privateKey must be an object but received ${authorityPrivateKey}`,
    )
  }
  if (typeof serialNumber !== "number") {
    throw new TypeError(`serial must be a number but received ${serialNumber}`)
  }

  if (typeof validityDurationInMs !== "number") {
    throw new TypeError(
      `validityDurationInMs must be a number but received ${validityDurationInMs}`,
    )
  }
  if (validityDurationInMs < 1) {
    throw new TypeError(`validityDurationInMs must be > 0 but received ${validityDurationInMs}`)
  }
  const serverCertificateValidityDuration =
    verifyRootCertificateValidityDuration(validityDurationInMs)
  if (!serverCertificateValidityDuration.ok) {
    validityDurationInMs = serverCertificateValidityDuration.maxAllowedValue
    logger.warn(
      createDetailedMessage(serverCertificateValidityDuration.message, {
        details: serverCertificateValidityDuration.details,
      }),
    )
  }

  const forge = await importNodeForge()
  const { pki } = forge
  const forgeCertificate = pki.createCertificate()
  const { privateKey, publicKey } = pki.rsa.generateKeyPair(2048)

  forgeCertificate.publicKey = publicKey
  forgeCertificate.serialNumber = serialNumber.toString(16)
  forgeCertificate.validity.notBefore = new Date()
  forgeCertificate.validity.notAfter = new Date(Date.now() + validityDurationInMs)

  const attributeDescription = {
    ...attributeDescriptionFromAttributeArray(authorityForgeCertificate.subject.attributes),
    commonName,
    organizationName,
  }
  const attributeArray = attributeArrayFromAttributeDescription(attributeDescription)
  forgeCertificate.setSubject(attributeArray)
  forgeCertificate.setIssuer(authorityForgeCertificate.subject.attributes)
  forgeCertificate.setExtensions(
    extensionArrayFromExtensionDescription({
      basicConstraints: {
        critical: true,
        cA: false,
      },
      keyUsage: {
        critical: true,
        digitalSignature: true,
        keyEncipherment: true,
      },
      extKeyUsage: {
        critical: false,
        serverAuth: true,
      },
      authorityKeyIdentifier: {
        critical: false,
        keyIdentifier: authorityForgeCertificate.generateSubjectKeyIdentifier().getBytes(),
      },
      subjectAltName: {
        critical: false,
        altNames: subjectAltNamesFromAltNames(altNames),
      },
    }),
  )
  forgeCertificate.sign(authorityPrivateKey, forge.sha256.create())

  return {
    forgeCertificate,
    publicKey,
    privateKey,
  }
}
