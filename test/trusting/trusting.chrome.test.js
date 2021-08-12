import { getCertificate } from "@jsenv/https-certificate"

const certificate = await getCertificate(["localhost"], {
  rootCertificateParams: {
    commonName: "https://github.com/jsenv/https-certificate",
    countryName: "FR",
    stateOrProvinceName: "Alpes Maritimes",
    localityName: "Valbonne",
    organizationName: "jsenv",
    organizationalUnitName: "https cert",
    validityInYears: 1,
  },
  certificateParams: {
    validityInDays: 1,
  },
})
