// https://github.com/digitalbazaar/forge/blob/master/examples/create-cert.js
// https://github.com/digitalbazaar/forge/issues/660#issuecomment-467145103

import { importNodeForge } from "./internal/forge.js"
import {
  attributeArrayFromAttributeDescription,
  attributeDescriptionFromAttributeArray,
  subjectAltNamesFromAltNames,
  extensionArrayFromExtensionDescription,
} from "./internal/certificate_data_converter.js"

export const createCertificateAuthority = async ({
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

  const forge = await importNodeForge()
  const { pki } = forge
  const forgeCertificate = pki.createCertificate()
  const { privateKey, publicKey } = pki.rsa.generateKeyPair(2048)

  forgeCertificate.publicKey = publicKey
  forgeCertificate.serialNumber = serialNumber.toString(16)
  forgeCertificate.validity.notBefore = new Date(Date.now() - 1000)
  forgeCertificate.validity.notAfter = createDateInXYears(validityInYears)

  const attributeDescription = {
    commonName,
    countryName,
    stateOrProvinceName,
    localityName,
    organizationName,
    organizationalUnitName,
  }
  const attributeArray = attributeArrayFromAttributeDescription(attributeDescription)
  forgeCertificate.setSubject(attributeArray)
  forgeCertificate.setIssuer(attributeArray)
  forgeCertificate.setExtensions(
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
  forgeCertificate.sign(privateKey, forge.sha256.create())

  return {
    forgeCertificate,
    publicKey,
    privateKey,
  }
}

export const requestCertificateFromAuthority = async ({
  certificateAuthority,
  organizationName,
  altNames = [],
  validityInDays = 396,
  serialNumber = 1,
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
  if (typeof authorityPrivateKey !== "string") {
    throw new TypeError(
      `certificateAuthority.privateKey must be a string but received ${authorityPrivateKey}`,
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

  const forge = await importNodeForge()
  const { pki } = forge
  const forgeCertificate = pki.createCertificate()
  const { privateKey, publicKey } = pki.rsa.generateKeyPair(2048)

  forgeCertificate.publicKey = publicKey
  forgeCertificate.serialNumber = serialNumber.toString(16)
  forgeCertificate.validity.notBefore = new Date(Date.now() - 1000)
  forgeCertificate.validity.notAfter = createDateInXDays(validityInDays)

  const attributeDescription = {
    ...attributeDescriptionFromAttributeArray(authorityForgeCertificate.subject.attributes),
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
        serverAuth: true,
      },
      authorityKeyIdentifier: {
        keyIdentifier: authorityForgeCertificate.generateSubjectKeyIdentifier().getBytes(),
      },
      subjectAltName: subjectAltNamesFromAltNames(altNames),
    }),
  )
  forgeCertificate.sign(authorityPrivateKey, forge.sha256.create())

  return {
    forgeCertificate,
    publicKey,
    privateKey,
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
