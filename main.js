/*
 * This file is the first file executed by code using the package
 * Its responsability is to export what is documented
 * Ideally this file should be kept simple to help discovering codebase progressively.
 */

export {
  installCertificateAuthority,
  uninstallCertificateAuthority,
} from "./src/authority_certificate.js"

export {
  createValidityDurationOfXYears,
  createValidityDurationOfXDays,
} from "./src/validity_duration.js"

export { verifyHostsFile } from "./src/verify_hosts.js"

export { requestCertificateForLocalhost } from "./src/localhost_certificate.js"
