## 2.0.0

- requestCertificateForLocalhost changes
  - becomes sync
  - serverCertificateAltNames renamed altNames
  - serverCertificateValidityDurationInMs renamed validityDurationInMs
  - serverCertificateCommonName renamed commonName
  - returns { certificate, privateKey } instead of { serverCertificate, serverPrivateKey }
