/*
 * This file is the first file executed by code using the package
 * Its responsability is to export what is documented
 * Ideally this file should be kept simple to help discovering codebase progressively.
 */

export {
  installCertificateAuthority,
  uninstallCertificateAuthority,
} from "./certificate_authority.js"

export {
  createValidityDurationOfXYears,
  createValidityDurationOfXDays,
} from "./validity_duration.js"

export { verifyHostsFile } from "./hosts_file_verif.js"

export { requestCertificateForLocalhost } from "./certificate_for_localhost.js"
