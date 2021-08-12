import { assert } from "@jsenv/assert"

import { createRootCertificate, createCertificate } from "@jsenv/https-certificate"

const jsenvRootCertificate = await createRootCertificate({
  serial: "00",
  commonName: "https://github.com/jsenv/server",
  countryName: "FR",
  stateOrProvinceName: "Alpes Maritimes",
  localityName: "Valbonne",
  organizationName: "jsenv",
  organizationalUnitName: "jsenv server",
})

{
  const actual = jsenvRootCertificate
  const expected = {
    publicKeyPem: assert.any(String),
    privateKeyPem: assert.any(String),
    certificatePem: assert.any(String),
  }
  assert({ actual, expected })
}

{
  const jsenvServerCertificate = await createCertificate({
    rootCertificate: jsenvRootCertificate,
    altNames: ["127.0.0.1", "localhost", "jsenv"],
  })
  const actual = jsenvServerCertificate
  const expected = {
    publicKeyPem: assert.any(String),
    privateKeyPem: assert.any(String),
    certificatePem: assert.any(String),
  }
  assert({ actual, expected })
}
