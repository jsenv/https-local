// https://github.com/digitalbazaar/forge/blob/master/examples/create-cert.js
// https://github.com/digitalbazaar/forge/issues/660#issuecomment-467145103

import { createRequire } from "node:module"

import {
  attributeArrayFromAttributeDescription,
  attributeDescriptionFromAttributeArray,
  subjectAltNamesFromAltNames,
  extensionArrayFromExtensionDescription,
} from "./internal/certificate_data_converter.js"

const require = createRequire(import.meta.url)

export const createRootCertificate = async ({
  commonName,
  countryName,
  stateOrProvinceName,
  localityName,
  organizationName,
  organizationalUnitName,
  validityInYears = 20,
  serialNumber = 0,
} = {}) => {
  if (typeof serialNumber !== "number") {
    throw new TypeError(`serial must be a number but received ${serialNumber}`)
  }

  const forge = require("node-forge")
  const { pki } = forge
  const certificate = pki.createCertificate()
  const { privateKey, publicKey } = pki.rsa.generateKeyPair(2048)

  certificate.publicKey = publicKey
  certificate.serialNumber = serialNumber.toString(16)
  certificate.validity.notBefore = new Date(Date.now() - 1000)
  certificate.validity.notAfter = createDateInXYears(validityInYears)

  const attributeDescription = {
    commonName,
    countryName,
    stateOrProvinceName,
    localityName,
    organizationName,
    organizationalUnitName,
  }
  const attributeArray = attributeArrayFromAttributeDescription(attributeDescription)
  certificate.setSubject(attributeArray)
  certificate.setIssuer(attributeArray)
  certificate.setExtensions(
    extensionArrayFromExtensionDescription({
      basicConstraints: {
        critical: true,
        cA: true,
      },
      keyUsage: {
        critical: true,
        keyCertSign: true,
        cRLSign: true,
      },
    }),
  )

  // self-sign certificate
  certificate.sign(privateKey, forge.sha256.create())

  return {
    publicKeyPem: pki.publicKeyToPem(publicKey),
    privateKeyPem: pki.privateKeyToPem(privateKey),
    certificatePem: pki.certificateToPem(certificate),
  }
}

export const createCertificate = async ({
  rootCertificate,
  certificateAttributes = {},
  altNames = [],
  validityInDays = 396,
  // https://datatracker.ietf.org/doc/html/rfc5280#section-4.1.2.2
  serialNumber = 1,
}) => {
  if (typeof rootCertificate !== "object" || rootCertificate === null) {
    throw new TypeError(`rootCertificate must be an object but received ${rootCertificate}`)
  }
  const rootCertificatePem = rootCertificate.certificatePem
  if (typeof rootCertificatePem !== "string") {
    throw new TypeError(
      `rootCertificate.certificatePem must be a string but received ${rootCertificatePem}`,
    )
  }
  const rootCertificatePrivateKeyPem = rootCertificate.privateKeyPem
  if (typeof rootCertificatePrivateKeyPem !== "string") {
    throw new TypeError(
      `rootCertificate.privateKeyPem must be a string but received ${rootCertificatePem}`,
    )
  }
  if (typeof serialNumber !== "number") {
    throw new TypeError(`serial must be a number but received ${serialNumber}`)
  }

  // certificate must not exceed 397 days
  // https://stackoverflow.com/questions/64597721/neterr-cert-validity-too-long-the-server-certificate-has-a-validity-period-t
  if (validityInDays > 396) {
    console.warn(
      `A certificate validity of ${validityInDays} days is too much, using the max allowed value: 396 days`,
    )
    validityInDays = 396
  }

  const forge = require("node-forge")
  const { pki } = forge
  const forgeRootCertificate = pki.certificateFromPem(rootCertificatePem)
  const certificate = pki.createCertificate()
  const { privateKey, publicKey } = pki.rsa.generateKeyPair(2048)

  certificate.publicKey = publicKey
  certificate.serialNumber = serialNumber.toString(16)
  certificate.validity.notBefore = new Date(Date.now() - 1000)
  certificate.validity.notAfter = createDateInXDays(validityInDays)

  const attributeDescription = {
    ...attributeDescriptionFromAttributeArray(forgeRootCertificate.subject.attributes),
    ...certificateAttributes,
  }
  const attributeArray = attributeArrayFromAttributeDescription(attributeDescription)
  certificate.setSubject(attributeArray)
  certificate.setIssuer(forgeRootCertificate.subject.attributes)
  certificate.setExtensions(
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
        serverAuth: true,
      },
      authorityKeyIdentifier: {
        keyIdentifier: rootCertificate.generateSubjectKeyIdentifier().getBytes(),
      },
      subjectAltName: subjectAltNamesFromAltNames(altNames),
    }),
  )
  const rootCertificatePrivateKey = pki.privateKeyFromPem(rootCertificatePrivateKeyPem)
  certificate.sign(rootCertificatePrivateKey, forge.sha256.create())

  return {
    publicKeyPem: pki.publicKeyToPem(publicKey),
    privateKeyPem: pki.privateKeyToPem(privateKey),
    certificatePem: pki.certificateToPem(certificate),
  }
}

const createDateInXYears = (years) => {
  const date = new Date()
  date.setFullYear(date.getFullYear() + years)
  return date
}

const createDateInXDays = (days) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date
}
