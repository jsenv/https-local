// https://github.com/digitalbazaar/forge/blob/master/examples/create-cert.js
// https://github.com/digitalbazaar/forge/issues/660#issuecomment-467145103

import { createRequire } from "node:module"

const require = createRequire(import.meta.url)

export const createRootCertificate = async ({
  commonName,
  countryName,
  stateOrProvinceName,
  localityName,
  organizationName,
  organizationalUnitName,
  validityInYears = 20,
  serial = "00",
}) => {
  const forge = require("node-forge")
  if (typeof serial === "undefined") {
    // a random serial number
    serial = toPositiveHex(forge.util.bytesToHex(forge.random.getBytesSync(8)))
  }

  const { pki } = forge
  const certificate = pki.createCertificate()
  const { privateKey, publicKey } = pki.rsa.generateKeyPair(2048)

  certificate.publicKey = publicKey
  certificate.serialNumber = serial
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
    extensionToExtensionArray({
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
  rootCertificatePem,
  rootCertificatePrivateKeyPem,
  certificateAttributes = {},
  altNames = [],
  validityInDays = 396,
  // https://datatracker.ietf.org/doc/html/rfc5280#section-4.1.2.2
  serial = "01",
}) => {
  const forge = require("node-forge")
  // certificate must not exceed 397 days
  // https://stackoverflow.com/questions/64597721/neterr-cert-validity-too-long-the-server-certificate-has-a-validity-period-t
  if (validityInDays > 396) {
    console.warn(
      `A certificate validity of ${validityInDays} days is too much, using the max allowed value: 396 days`,
    )
    validityInDays = 396
  }

  const { pki } = forge
  const rootCertificate = pki.certificateFromPem(rootCertificatePem)
  const certificate = pki.createCertificate()
  const { privateKey, publicKey } = pki.rsa.generateKeyPair(2048)

  certificate.publicKey = publicKey
  certificate.serialNumber = serial
  certificate.validity.notBefore = new Date(Date.now() - 1000)
  certificate.validity.notAfter = createDateInXDays(validityInDays)

  const attributeDescription = {
    ...attributeDescriptionFromAttributeArray(rootCertificate.subject.attributes),
    ...certificateAttributes,
  }
  const attributeArray = attributeArrayFromAttributeDescription(attributeDescription)
  certificate.setSubject(attributeArray)
  certificate.setIssuer(rootCertificate.subject.attributes)
  certificate.setExtensions(
    extensionToExtensionArray({
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

const subjectAltNamesFromAltNames = (altNames) => {
  const isIp = require("is-ip")
  const isUrl = (value) => {
    try {
      // eslint-disable-next-line no-new
      new URL(value)
      return true
    } catch (e) {
      return false
    }
  }

  const altNamesArray = altNames.map((altName) => {
    if (isIp(altName)) {
      return {
        type: 7,
        ip: altName,
      }
    }
    if (isUrl(altName)) {
      return {
        type: 6,
        value: altName,
      }
    }
    // 2 is DNS (Domain Name Server)
    return {
      type: 2,
      value: altName,
    }
  })

  return {
    altNames: altNamesArray,
  }
}

const toPositiveHex = (hexString) => {
  let mostSiginficativeHexAsInt = parseInt(hexString[0], 8)
  if (mostSiginficativeHexAsInt < 8) {
    return hexString
  }

  mostSiginficativeHexAsInt -= 8
  return mostSiginficativeHexAsInt.toString() + hexString.substring(1)
}

const extensionToExtensionArray = (extensions) => {
  const extensionArray = []
  Object.keys(extensions).forEach((key) => {
    extensionArray.push({
      name: key,
      ...extensions[key],
    })
  })
  return extensionArray
}

const attributeDescriptionFromAttributeArray = (attributeArray) => {
  const attributeObject = {}
  attributeArray.forEach((attribute) => {
    attributeObject[attribute.name] = attribute.value
  })
  return attributeObject
}

const attributeArrayFromAttributeDescription = (attributeDescription) => {
  const attributeArray = []
  Object.keys(attributeDescription).forEach((key) => {
    const value = attributeDescription[key]
    if (typeof value === "undefined") {
      return
    }
    attributeArray.push({
      name: key,
      value: attributeDescription[key],
    })
  })
  return attributeArray
}
