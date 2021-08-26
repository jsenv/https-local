# Https localhost

Generate https certificate to use for a server running on localhost.

[![npm package](https://img.shields.io/npm/v/@jsenv/https-localhost.svg?logo=npm&label=package)](https://www.npmjs.com/package/@jsenv/https-localhost)
[![github main](https://github.com/jsenv/https-localhost/workflows/main/badge.svg)](https://github.com/jsenv/https-localhost/actions?workflow=main)
[![codecov coverage](https://codecov.io/gh/jsenv/https-localhost/branch/main/graph/badge.svg)](https://codecov.io/gh/jsenv/https-localhost)

# Presentation

`@jsenv/https-localhost` helps you to get certificates for your local server running in HTTPS.

```js
import {
  installCertificateAuthority,
  verifyHostsFile,
  requestCertificateForLocalhost,
} from "@jsenv/https-localhost"

await installCertificateAuthority()
await verifyHostsFile({
  ipMappings: {
    "127.0.0.1": ["localhost", "local.example.com"],
  },
})
const { serverCertificate, serverPrivateKey } = await requestCertificateForLocalhost({
  serverCertificateAltNames: ["localhost", "local.example.com"],
})
```

# How to use

_installCertificateAuthority_ function will generate a root certificate authority valid for 20 years. This function is designed to be runned once per machine and same for _verifyHostsFile_.

```js
import { installCertificateAuthority, verifyHostsFile } from "@jsenv/https-localhost"

await installCertificateAuthority()
await verifyHostsFile({
  ipMappings: {
    "127.0.0.1": ["localhost", "local.example.com"],
  },
})
```

```console
Search existing certificate authority on filesystem...
Authority root certificate file is not on filesystem at /Users/dmail/jsenv_root_certificate.crt
ℹ no certificate authority on filesystem
Generating authority root certificate...
✔ authority root certificate valid for 20 years written at /Users/dmail/jsenv_https_localhost/jsenv_root_certificate.crt
```

# installCertificateAuthority

```js
installCertificateAuthority({
  certificateCommonName: "Jsenv localhost root certificate",
  certificateValidityDurationInMs: 630720005000, // 20 years
  tryToTrust: false,
  NSSDynamicInstall: false,
})
```

# verifyHostsFile

# requestCertificateForLocalhost

# Trusting certificate

Every time _requestCertificateForLocalhost_ is executed it checks if the root certificate is trusted. When not, a log explains how to trust it on your OS.

_Message when certificate is not trusted on macOS_

```console
Root certificate must be added to macOS keychain
--- root certificate file ---
/Users/dmail/Library/Application Support/jsenv_https_localhost/jsenv_root_certificate.crt
--- suggested documentation ---
https://support.apple.com/guide/keychain-access/add-certificates-to-a-keychain-kyca2431/mac
--- suggested command ---
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain -p ssl -p basic "/Users/dmail/Library/Application Support/jsenv_https_localhost/jsenv_root_certificate.crt"
```

It is possible to automate the trusting of the root certificate using _tryToTrustRootCertificate_.

```js
import { requestCertificateForLocalhost } from "@jsenv/https-localhost"

const { serverCertificate, serverPrivateKey } = await requestCertificateForLocalhost({
  serverCertificateFileUrl: new URL("./certificates/server.crt", import.meta.url),
  tryToTrustRootCertificate: true,
})
```

# Mapping hosts

Every time _requestCertificateForLocalhost_ is executed it checks if server hostnames are properly mapped to _127.0.0.1_ in your hosts file.

_Message when hostnames are not mapped on macOS_

```console
2 hostnames(s) must be mapped to 127.0.0.1
--- hostnames ---
localhost
*.localhost
--- hosts file ---
/etc/hosts
--- suggested hosts file content ---
127.0.0.1 localhost
127.0.0.1 *.localhost
```

It is possible to automate the update of hosts file using _tryToRegisterHostnames_.

```js
import { requestCertificateForLocalhost } from "@jsenv/https-localhost"

const { serverCertificate, serverPrivateKey } = await requestCertificateForLocalhost({
  serverCertificateFileUrl: new URL("./certificates/server.crt", import.meta.url),
  tryToRegisterHostnames: true,
})
```

On windows _tryToRegisterHostnames_ is ignored, you have to do it manually for now.

# Add more alternative names

When you need to make certificate works for other hosts than localhost use _serverCertificateAltNames_.

```js
import { requestCertificateForLocalhost } from "@jsenv/https-localhost"

const { serverCertificate, serverPrivateKey } = await requestCertificateForLocalhost({
  serverCertificateFileUrl: new URL("./certificates/server.crt", import.meta.url),
  serverCertificateAltNames: ["whatever"], // makes certificate also valid for https://whatever
})
```

All host passed in _serverCertificateAltNames_ must be mapped to 127.0.0.1 in your hosts file.
This is done for you when _tryToRegisterHostnames_ is enabled.

# Usage with node server

```js
import { createServer } from "node:https"
import { requestCertificateForLocalhost } from "@jsenv/https-localhost"

const { serverCertificate, serverPrivateKey } = await requestCertificateForLocalhost({
  serverCertificateFileUrl: new URL("./certificates/server.crt", import.meta.url),
  tryToTrustRootCertificate: true,
  tryToRegisterHostnames: true,
})

const server = createServer(
  {
    cert: serverCertificate,
    key: serverPrivateKey,
  },
  (request, response) => {
    const body = "Hello world"
    response.writeHead(200, {
      "content-type": "text/plain",
      "content-length": Buffer.byteLength(body),
    })
    response.write(body)
    response.end()
  },
)
server.listen(8080)

console.log(`Server listening at https://localhost:8080`)
```

# Installation

```console
npm install --save-dev @jsenv/https-localhost
```

# Development

If you are part or want to be part of the developpers of this package, check [development.md](./docs/development.md)
