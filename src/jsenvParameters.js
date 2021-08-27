import { createValidityDurationOfXYears } from "./validity_duration.js"

export const jsenvParameters = {
  certificateCommonName: "https-localhost root certificate",
  certificateValidityDurationInMs: createValidityDurationOfXYears(20),
}

// const jsenvCertificateParams = {
//   rootCertificateOrganizationName: "jsenv",
//   rootCertificateOrganizationalUnitName: "https-localhost",
//   rootCertificateCountryName: "FR",
//   rootCertificateStateOrProvinceName: "Alpes Maritimes",
//   rootCertificateLocalityName: "Valbonne",
// }
