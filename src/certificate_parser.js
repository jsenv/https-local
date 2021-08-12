import { createRequire } from "node:module"

import {
  attributeDescriptionFromAttributeArray,
  extensionDescriptionFromExtensionArray,
} from "./internal/certificate_data_converter.js"

const require = createRequire(import.meta.url)

// https://github.com/digitalbazaar/forge/blob/c666282c812d6dc18e97b419b152dd6ad98c802c/lib/pem.js#L95
export const parseCertificate = async (certificateString) => {
  if (typeof certificateString !== "string") {
    throw new TypeError(`certificateString must be a string, received ${certificateString}`)
  }

  const forge = require("node-forge")
  const { pki } = forge

  const certificate = pki.certificateFromPem(certificateString)

  const { version } = certificate
  const serialNumber = parseInt(certificate.serialNumber, 16)
  const attributes = attributeDescriptionFromAttributeArray(certificate.subject.attributes)
  const extensions = extensionDescriptionFromExtensionArray(certificate.extensions)
  const notValidBeforeDate = certificate.validity.notBefore
  const notValidAfterDate = certificate.validity.notAfter

  return {
    version,
    serialNumber,
    attributes,
    extensions,
    notValidBeforeDate,
    notValidAfterDate,
  }
}
