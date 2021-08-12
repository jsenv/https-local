import { assert } from "@jsenv/assert"

import {
  createRootCertificate,
  parseCertificate,
  createCertificate,
} from "@jsenv/https-certificate"

const jsenvRootCertificate = await createRootCertificate({
  commonName: "https://github.com/jsenv/server",
  countryName: "FR",
  stateOrProvinceName: "Alpes Maritimes",
  localityName: "Valbonne",
  organizationName: "jsenv",
  organizationalUnitName: "jsenv server",
})

{
  const actual = await parseCertificate(jsenvRootCertificate.certificatePem)
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

{
  const jsenvServerCertificate = await createCertificate({
    rootCertificatePem: jsenvRootCertificate.certificatePem,
    rootCertificatePrivateKeyPem: jsenvRootCertificate.privateKeyPem,
    altNames: ["127.0.0.1", "localhost", "jsenv"],
  })
  const actual = await parseCertificate(jsenvServerCertificate.certificatePem)
  const expected = {
    version: 2,
    serialNumber: "01",
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
        cA: false,
      },
      keyUsage: {
        id: "2.5.29.15",
        critical: true,
        value: assert.any(String),
        digitalSignature: true,
        nonRepudiation: false,
        keyEncipherment: true,
        dataEncipherment: false,
        keyAgreement: false,
        keyCertSign: false,
        cRLSign: false,
        encipherOnly: false,
        decipherOnly: false,
      },
      extKeyUsage: {
        id: "2.5.29.37",
        critical: false,
        value: assert.any(String),
        serverAuth: true,
      },
      authorityKeyIdentifier: {
        id: "2.5.29.35",
        critical: false,
        value: assert.any(String),
      },
      subjectAltName: {
        id: "2.5.29.17",
        critical: false,
        value: assert.any(String),
        altNames: [
          {
            type: 7,
            value: assert.any(String),
            ip: "127.0.0.1",
          },
          {
            type: 2,
            value: "localhost",
          },
          {
            type: 2,
            value: "jsenv",
          },
        ],
      },
    },
    notValidBeforeDate: assert.any(Date),
    notValidAfterDate: assert.any(Date),
  }
  assert({ actual, expected })
}
