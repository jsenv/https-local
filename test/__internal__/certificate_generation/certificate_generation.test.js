import { assert } from "@jsenv/assert"

import {
  createCertificateAuthority,
  requestCertificateFromAuthority,
} from "@jsenv/https-localhost/src/certificate_generator.js"
import { resetCertificateAuhtorityFiles } from "@jsenv/https-localhost/src/localhost_certificate.js"

await resetCertificateAuhtorityFiles()
const jsenvCertificateAuthority = await createCertificateAuthority({
  commonName: "https://github.com/jsenv/server",
  countryName: "FR",
  stateOrProvinceName: "Alpes Maritimes",
  localityName: "Valbonne",
  organizationName: "jsenv",
  organizationalUnitName: "jsenv server",
  serialNumber: 1,
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
  })
  const actual = jsenvServerCertificate
  const expected = {
    forgeCertificate: assert.any(Object),
    publicKey: assert.any(Object),
    privateKey: assert.any(Object),
  }
  assert({ actual, expected })
}
