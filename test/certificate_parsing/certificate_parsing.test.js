import { assert } from "@jsenv/assert"

import { createRootCertificate, parseCertificate } from "@jsenv/https-certificate"

const jsenvRootCertificate = await createRootCertificate({
  commonName: "https://github.com/jsenv/server",
  countryName: "FR",
  stateOrProvinceName: "Alpes Maritimes",
  localityName: "Valbonne",
  organizationName: "jsenv",
  organizationalUnitName: "jsenv server",
})

{
  const certificateInfo = await parseCertificate(jsenvRootCertificate.certificatePem)
  const actual = certificateInfo
  const expected = {
    version: 2,
    serialNumber: "00",
    attributes: {
      commonName: "https://github.com/jsenv/server",
      countryName: "FR",
      stateOrProvinceName: "Alpes Maritimes",
      localityName: "Valbonne",
      organizationName: "jsenv",
      organizationalUnitName: "jsenv server",
    },
    extensions: {
      basicConstraints: {
        id: "2.5.29.19",
        critical: true,
        value: assert.any(String),
        cA: true,
      },
      keyUsage: {
        id: "2.5.29.15",
        critical: true,
        value: assert.any(String),
        digitalSignature: false,
        nonRepudiation: false,
        keyEncipherment: false,
        dataEncipherment: false,
        keyAgreement: false,
        keyCertSign: true,
        cRLSign: true,
        encipherOnly: false,
        decipherOnly: false,
      },
    },
    notValidBeforeDate: assert.any(Date),
    notValidAfterDate: assert.any(Date),
  }
  assert({ actual, expected })
}
