// https://github.com/digitalbazaar/forge/blob/master/examples/create-cert.js
// https://github.com/digitalbazaar/forge/issues/660#issuecomment-467145103

import { importNodeForge } from "./forge.js"
import {
  attributeArrayFromAttributeDescription,
  attributeDescriptionFromAttributeArray,
  subjectAltNamesFromAltNames,
  extensionArrayFromExtensionDescription,
} from "./certificate_data_converter.js"

export const createCertificateAuthority = async ({
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
  rootForgeCertificate,
  rootForgePrivateKey,
  serverCertificateAltNames = [],
  serverCertificateValidityDurationInMs,
  serverCertificateSerialNumber,
}) => {
  if (typeof rootForgeCertificate !== "object" || rootForgeCertificate === null) {
    throw new TypeError(
      `rootForgeCertificate must be an object but received ${rootForgeCertificate}`,
    )
  }
  if (typeof rootForgePrivateKey !== "object" || rootForgePrivateKey === null) {
    throw new TypeError(`rootForgePrivateKey must be an object but received ${rootForgePrivateKey}`)
  }
  if (typeof serverCertificateSerialNumber !== "number") {
    throw new TypeError(
      `serverCertificateSerialNumber must be a number but received ${serverCertificateSerialNumber}`,
    )
  }

  const forge = await importNodeForge()
  const { pki } = forge
  const forgeCertificate = pki.createCertificate()
  const { privateKey, publicKey } = pki.rsa.generateKeyPair(2048)

  forgeCertificate.publicKey = publicKey
  forgeCertificate.serialNumber = serverCertificateSerialNumber.toString(16)
  forgeCertificate.validity.notBefore = new Date()
  forgeCertificate.validity.notAfter = new Date(Date.now() + serverCertificateValidityDurationInMs)

  const attributeDescription = {
    ...attributeDescriptionFromAttributeArray(rootForgeCertificate.subject.attributes),
    // commonName: serverCertificateCommonName,
    // organizationName: serverCertificateOrganizationName
  }
  const attributeArray = attributeArrayFromAttributeDescription(attributeDescription)
  forgeCertificate.setSubject(attributeArray)
  forgeCertificate.setIssuer(rootForgeCertificate.subject.attributes)
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
        keyIdentifier: rootForgeCertificate.generateSubjectKeyIdentifier().getBytes(),
      },
      subjectAltName: {
        critical: false,
        altNames: subjectAltNamesFromAltNames(serverCertificateAltNames),
      },
    }),
  )
  forgeCertificate.sign(rootForgePrivateKey, forge.sha256.create())

  return {
    forgeCertificate,
    publicKey,
    privateKey,
  }
}
