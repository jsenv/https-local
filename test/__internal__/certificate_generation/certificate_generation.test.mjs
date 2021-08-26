import { assert } from "@jsenv/assert"

import {
  createAuthorityRootCertificate,
  requestCertificateFromAuthority,
} from "@jsenv/https-localhost/src/internal/certificate_generator.js"
import { createLoggerForTest } from "@jsenv/https-localhost/test/test_helpers.mjs"

const {
  rootCertificateForgeObject,
  rootCertificatePublicKeyForgeObject,
  rootCertificatePrivateKeyForgeObject,
} = await createAuthorityRootCertificate({
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
  const actual = {
    rootCertificateForgeObject,
    rootCertificatePublicKeyForgeObject,
    rootCertificatePrivateKeyForgeObject,
  }
  const expected = {
    rootCertificateForgeObject: assert.any(Object),
    rootCertificatePublicKeyForgeObject: assert.any(Object),
    rootCertificatePrivateKeyForgeObject: assert.any(Object),
  }
  assert({ actual, expected })
}

{
  const certificate = await requestCertificateFromAuthority({
    authorityCertificateForgeObject: rootCertificateForgeObject,
    auhtorityCertificatePrivateKeyForgeObject: rootCertificatePrivateKeyForgeObject,
    serialNumber: 1,
    altNames: ["localhost", "jsenv"],
    validityDurationInMs: 100,
  })
  const actual = certificate
  const expected = {
    certificateForgeObject: assert.any(Object),
    certificatePublicKeyForgeObject: assert.any(Object),
    certificatePrivateKeyForgeObject: assert.any(Object),
  }
  assert({ actual, expected })
}

// ici ça serais bien de tester des truc de forge,
// genre que le certificat issuer est bien l'authorité
PEM
