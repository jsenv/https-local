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

_installCertificateAuthority_ function generates a certificate authority valid for 20 years.
It is compatible with mac, linux and windows.

```js
import { installCertificateAuthority } from "@jsenv/https-localhost"

await installCertificateAuthority()
```

_1st run_

<!--
here maybe gather logs for mac, window, linux
and put them into details
-->

```console
> node ./install_certificate_authority.mjs

ℹ authority root certificate not found in filesystem
Generating authority root certificate valid for 20 years...
✔ authority root certificate written at /Users/dmail/https_localhost/http_localhost_root_certificate.crt
ℹ You should add root certificate to mac OS keychain
ℹ You should add root certificate to Firefox
```

_2nd run_

```console
> node ./install_certificate_authority.mjs

✔ authority root certificate found in filesystem
Checking certificate validity...
✔ certificate valid for 19 years
Detect if certificate attributes have changed...
✔ certificate attributes are the same
Check if certificate is trusted by mac OS...
ℹ certificate not trusted by mac OS
Check if certificate is trusted by Firefox...
ℹ certificate not trusted by Firefox
```

By default it's up to you to add authority root certificate to trust store.

## Auto trust

It's possible to trust root certificate programmatically using _tryToTrust_.

```js
import { installCertificateAuthority } from "@jsenv/https-localhost"

await installCertificateAuthority({
  tryToTrust: true,
})
```

```console
> node ./install_certificate_authority.mjs

ℹ authority root certificate not found in filesystem
Generating authority root certificate valid for 20 years...
✔ authority root certificate written at /Users/dmail/https_localhost/https_localhost_root_certificate.crt
Adding certificate to mac keychain...
❯ sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain "/Users/dmail/https_localhost/https_localhost_root_certificate.crt"
Password:
✔ certificate added to mac keychain
Adding certificate in Firefox...
✔ certificate added in Firefox
```

As you can see you'll be prompted to enter your password.

Running funciton a second time would log the following:

```console
> node ./install_certificate_authority.mjs

✔ authority root certificate found in filesystem
Checking certificate validity...
✔ certificate valid for 19 years
Detect if certificate attributes have changed...
✔ certificate attributes are the same
Check if certificate is trusted by mac OS...
✔ certificate trusted by mac OS
Check if certificate is trusted by Firefox...
✔ certificate trusted by Firefox
```

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
