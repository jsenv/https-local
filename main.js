/*
 * This file is the first file executed by code using the package
 * Its responsability is to export what is documented
 * Ideally this file should be kept simple to help discovering codebase progressively.
 */

export { getCertificate } from "./src/certificate_store.js"
export { createRootCertificate, createCertificate } from "./src/certificate_generator.js"
export { parseCertificate } from "./src/certificate_parser.js"

export { platformTrustStore } from "./src/platform_trust_store.js"
