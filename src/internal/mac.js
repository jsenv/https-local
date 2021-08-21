/*
 * see
 * - https://github.com/davewasmer/devcert/blob/master/src/platforms/darwin.ts
 * - https://www.unix.com/man-page/mojave/1/security/
 */

export { getRootCertificateTrustInfo } from "./mac/root_certificate_trust_info.js"
export { installRootCertificate } from "./mac/root_certificate_installation.js"
export { uninstallRootCertificate } from "./mac/root_certificate_uninstallation.js"
