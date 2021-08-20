import { assert } from "@jsenv/assert"

import {
  createCertificateAuthority,
  requestCertificateFromAuthority,
} from "@jsenv/https-localhost/src/internal/certificate_generator.js"
import { createLoggerForTest } from "@jsenv/https-localhost/test/test_helpers.mjs"

const jsenvCertificateAuthority = await createCertificateAuthority({
  logger: createLoggerForTest(),
  commonName: "https://github.com/jsenv/server",
  countryName: "FR",
  stateOrProvinceName: "Alpes Maritimes",
  localityName: "Valbonne",
  organizationName: "jsenv",
  organizationalUnitName: "jsenv server",
  validityDurationInMs: 10,
  serialNumber: 0,
})

{
  const actual = jsenvCertificateAuthority
  const expected = {
    forgeCertificate: assert.any(Object),
    publicKey: assert.any(Object),
    privateKey: assert.any(Object),
  }
  assert({ actual, expected })
}

{
  const jsenvServerCertificate = await requestCertificateFromAuthority({
    certificateAuthority: jsenvCertificateAuthority,
    altNames: ["127.0.0.1", "localhost", "jsenv"],
    validityDurationInMs: 100,
    serialNumber: 1,
  })
  const actual = jsenvServerCertificate
  const expected = {
    forgeCertificate: assert.any(Object),
    publicKey: assert.any(Object),
    privateKey: assert.any(Object),
  }
  assert({ actual, expected })
}
