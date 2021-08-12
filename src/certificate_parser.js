import { createRequire } from "node:module"

const require = createRequire(import.meta.url)

// https://github.com/digitalbazaar/forge/blob/c666282c812d6dc18e97b419b152dd6ad98c802c/lib/pem.js#L95
export const parseCertificate = async (certificateString) => {
  const forge = require("node-forge")
  const { pem } = forge

  const data = pem.decode(certificateString)
  return data
}
