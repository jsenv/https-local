# https local

A programmatic way to generate locally trusted certificates

[![npm package](https://img.shields.io/npm/v/@jsenv/https-local.svg?logo=npm&label=package)](https://www.npmjs.com/package/@jsenv/https-local)
[![github main](https://github.com/jsenv/https-local/workflows/main/badge.svg)](https://github.com/jsenv/https-local/actions?workflow=main)
[![codecov coverage](https://codecov.io/gh/jsenv/https-local/branch/main/graph/badge.svg)](https://codecov.io/gh/jsenv/https-local)

# Presentation

Generate certificate(s) trusted by your operating system and browsers.
This certificate can be used to start your development server in HTTPS.
Works on mac, linux and windows.

# How to use

1 - Install _@jsenv/https-local_

```console
npm install --save-dev @jsenv/https-local
```

2 - Create _install_certificate_authority.mjs_

```js
/*
 * This file needs to be executed once. After that the root certificate is valid for 20 years.
 * Re-executing this file will log the current root certificate validity and trust status.
 * Re-executing this file 20 years later would reinstall a root certificate and re-trust it.
 *
 * Read more in https://github.com/jsenv/https-local#installCertificateAuthority
 */

import { installCertificateAuthority, verifyHostsFile } from "@jsenv/https-local"

await installCertificateAuthority({
  tryToTrust: true,
  NSSDynamicInstall: true,
})
await verifyHostsFile({
  ipMappings: {
    "127.0.0.1": ["localhost", "local.example"],
  },
  tryToUpdatesHostsFile: true,
})
```

3 - Run file to install certificate authority with node

```console
node ./install_certificate_authority.mjs
```

4 - Create _start_dev_server.mjs_

```js
/*
 * This file uses "@jsenv/https-local" to obtain a certificate used to start a server in https.
 * The certificate is valid for 1 year (396 days) and is issued by a certificate authority trusted on this machine.
 * If the certificate authority was not installed before executing this file, an error is thrown
 * explaining that certificate authority must be installed first.
 *
 * To install the certificate authority, you can use the following command
 *
 * > node ./install_certificate_authority.mjs
 *
 * Read more in https://github.com/jsenv/https-local#requestCertificateForLocalhost
 */

import { createServer } from "node:https"
import { requestCertificateForLocalhost } from "@jsenv/https-local"

const { serverCertificate, serverCertificatePrivateKey } = await requestCertificateForLocalhost({
  serverCertificateAltNames: ["localhost", "local.example"],
})

const server = createServer(
  {
    cert: serverCertificate,
    key: serverCertificatePrivateKey,
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
console.log(`Server listening at https://local.example:8080`)
```

5 - Run file to start server with node

```console
node ./start_dev_server.mjs
```

At this stage of the documentation you have a server running in https.
The rest of the documentation goes into details.

# Certificate expiration

The server certificate expires after one year which is the maximum duration allowed by web browsers.

In the unlikely scenario where your local server is running for more than a year without interruption, restart it and you're good for one more year.

The authority root certificate expires after 20 years which is close to the maximum allowed duration.

In the very unlikely scenario where you are using the same machine for more than 20 years, re-execute [installCertificateAuthority](#installCertificateAuthority) to update certificate authority then restart your server.

# installCertificateAuthority

_installCertificateAuthority_ function generates a certificate authority valid for 20 years.
This certificate authority is needed to generate local certificates that will be trusted by the operating system and web browsers.

```js
import { installCertificateAuthority } from "@jsenv/https-local"

await installCertificateAuthority()
```

By default, trusting authority root certificate is a manual process.
This manual process is documented in [BenMorel/dev-certificates#Import the CA in your browser](https://github.com/BenMorel/dev-certificates/tree/c10cd68945da772f31815b7a36721ddf848ff3a3#import-the-ca-in-your-browser).

Trusting the root certificate can also be done programmatically as explained in [Auto trust](#Auto-trust).

Find below logs written in terminal when this function is executed.

<details>
  <summary>mac</summary>

```console
> node ./install_certificate_authority.mjs

ℹ authority root certificate not found in filesystem
Generating authority root certificate with a validity of 20 years...
✔ authority root certificate written at /Users/dmail/https_local/http_local_root_certificate.crt
ℹ You should add root certificate to mac keychain
ℹ You should add root certificate to firefox
```

_second execution logs_

```console
> node ./install_certificate_authority.mjs

✔ authority root certificate found in filesystem
Checking certificate validity...
✔ certificate still valid for 19 years
Detect if certificate attributes have changed...
✔ certificate attributes are the same
Check if certificate is in mac keychain...
ℹ certificate not found in mac keychain
Check if certificate is in firefox...
ℹ certificate not found in firefox
```

</details>

<details>
  <summary>linux</summary>

```console
> node ./install_certificate_authority.mjs

ℹ authority root certificate not found in filesystem
Generating authority root certificate with a validity of 20 years...
✔ authority root certificate written at /home/dmail/.config/https_local/https_local_root_certificate.crt
ℹ You should add certificate to linux
ℹ You should add certificate to chrome
ℹ You should add certificate to firefox
```

_second execution logs_

```console
> node ./install_certificate_authority.mjs

✔ authority root certificate found in filesystem
Checking certificate validity...
✔ certificate still valid for 19 years
Detect if certificate attributes have changed...
✔ certificate attributes are the same
Check if certificate is in linux...
ℹ certificate in linux is outdated
Check if certificate is in chrome...
ℹ certificate not found in chrome
Check if certificate is in firefox...
ℹ certificate not found in firefox
```

</details>

<details>
  <summary>windows</summary>

```console
> node ./install_certificate_authority.mjs

ℹ authority root certificate not found in filesystem
Generating authority root certificate with a validity of 20 years...
✔ authority root certificate written at C:\Users\Dmail\AppData\Local\https_local\https_local_root_certificate.crt
ℹ You should add certificate to windows
ℹ You should add certificate to firefox
```

_second execution logs_

```console
> node ./install_certificate_authority.mjs

✔ authority root certificate found in filesystem
Checking certificate validity...
✔ certificate still valid for 19 years
Detect if certificate attributes have changed...
✔ certificate attributes are the same
Check if certificate is trusted by windows...
ℹ certificate is not trusted by windows
Check if certificate is trusted by firefox...
ℹ unable to detect if certificate is trusted by firefox (not implemented on windows)
```

</details>

## Auto trust

It's possible to trust root certificate programmatically using _tryToTrust_

```js
import { installCertificateAuthority } from "@jsenv/https-local"

await installCertificateAuthority({
  tryToTrust: true,
})
```

<details>
  <summary>mac</summary>

```console
> node ./install_certificate_authority.mjs

ℹ authority root certificate not found in filesystem
Generating authority root certificate with a validity of 20 years...
✔ authority root certificate written at /Users/dmail/https_local/https_local_root_certificate.crt
Adding certificate to mac keychain...
❯ sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain "/Users/dmail/https_local/https_local_root_certificate.crt"
Password:
✔ certificate added to mac keychain
Adding certificate to firefox...
✔ certificate added to Firefox
```

_second execution logs_

```console
> node ./install_certificate_authority.mjs

✔ authority root certificate found in filesystem
Checking certificate validity...
✔ certificate still valid for 19 years
Detect if certificate attributes have changed...
✔ certificate attributes are the same
Check if certificate is in mac keychain...
✔ certificate found in mac keychain
Check if certificate is in Firefox...
✔ certificate found in Firefox
```

</details>

<details>
  <summary>linux</summary>

```console
> node ./install_certificate_authority.mjs

✔ authority root certificate found in filesystem
Checking certificate validity...
✔ certificate still valid for 19 years
Detect if certificate attributes have changed...
✔ certificate attributes are the same
Check if certificate is in linux...
ℹ certificate not in linux
Adding certificate to linux...
❯ sudo /bin/cp -f "/home/dmail/.config/https_local/https_local_root_certificate.crt" /usr/local/share/ca-certificates/https_local_root_certificate.crt
[sudo] Password for dmail :
❯ sudo update-ca-certificates
✔ certificate added to linux
Check if certificate is in chrome...
ℹ certificate not found in chrome
Adding certificate to chrome...
✔ certificate added to chrome
Check if certificate is in firefox...
ℹ certificate not found in firefox
Adding certificate to firefox...
✔ certificate added to firefox
```

_second execution logs_

```console
> node ./install_certificate_authority.mjs

✔ authority root certificate found in filesystem
Checking certificate validity...
✔ certificate still valid for 19 years
Detect if certificate attributes have changed...
✔ certificate attributes are the same
Check if certificate is in linux...
✔ certificate found in linux
Check if certificate is in chrome...
✔ certificate found in chrome
Check if certificate is in firefox...
✔ certificate found in firefox
```

</details>

<details>
  <summary>windows</summary>

```console
> node ./install_certificate_authority.mjs

✔ authority root certificate found in filesystem
Checking certificate validity...
✔ certificate still valid for 19 years
Detect if certificate attributes have changed...
✔ certificate attributes are the same
Check if certificate is trusted by windows...
ℹ certificate not trusted by windows
Adding certificate to windows...
❯ certutil -addstore -user root C:\Users\Dmail\AppData\Local\https_local\https_local_root_certificate.crt
✔ certificate added to windows
Check if certificate is trusted by firefox...
ℹ unable to detect if certificate is trusted by firefox (not implemented on windows)
```

_second execution logs_

```console
> node ./install_certificate_authority.mjs

✔ authority root certificate found in filesystem
Checking certificate validity...
✔ certificate still valid for 19 years
Detect if certificate attributes have changed...
✔ certificate attributes are the same
Check if certificate is trusted by windows...
✔ certificate trusted by windows
Check if certificate is trusted by firefox...
ℹ unable to detect if certificate is trusted by firefox (not implemented on windows)
```

</details>

# requestCertificateForLocalhost

_requestCertificateForLocalhost_ function returns a certificate and private key that can be used to start a server in HTTPS.

```js
import { createServer } from "node:https"
import { requestCertificateForLocalhost } from "@jsenv/https-local"

const { serverCertificate, serverCertificatePrivateKey } = await requestCertificateForLocalhost({
  serverCertificateAltNames: ["localhost", "local.example"],
})
```

[installCertificateAuthority](#installCertificateAuthority) must be called before this function.

# verifyHostsFile

This function is not mandatory to obtain the https certificates.
But it is useful to programmatically verify ip mappings that are important for your local server are present in hosts file.

```js
import { verifyHostsFile } from "@jsenv/https-local"

await verifyHostsFile({
  ipMappings: {
    "127.0.0.1": ["localhost", "local.example"],
  },
})
```

Find below logs written in terminal when this function is executed.

<details>
  <summary>mac and linux</summary>

```console
> node ./verify_hosts.mjs

Check hosts file content...
⚠ 1 mapping is missing in hosts file
--- hosts file path ---
/etc/hosts
--- line(s) to add ---
127.0.0.1 localhost local.example
```

</details>

<details>
  <summary>windows</summary>

```console
> node ./verify_hosts.mjs

Check hosts file content...
⚠ 1 mapping is missing in hosts file
--- hosts file path ---
C:\\Windows\\System32\\Drivers\\etc\\hosts
--- line(s) to add ---
127.0.0.1 localhost local.example
```

</details>

## Auto update hosts

It's possible to update hosts file programmatically using _tryToUpdateHostsFile_.

```js
import { verifyHostsFile } from "@jsenv/https-local"

await verifyHostsFile({
  ipMappings: {
    "127.0.0.1": ["localhost", "local.example"],
  },
  tryToUpdateHostsFile: true,
})
```

<details>
  <summary>mac and linux</summary>

```console
Check hosts file content...
ℹ 1 mapping is missing in hosts file
Adding 1 mapping(s) in hosts file...
❯ echo "127.0.0.1 local.example" | sudo tee -a /etc/hosts
Password:
✔ mappings added to hosts file
```

_Second execution logs_

```console
> node ./verify_hosts.mjs

Check hosts file content...
✔ all ip mappings found in hosts file
```

</details>

<details>
  <summary>windows</summary>

```console
Check hosts file content...
ℹ 1 mapping is missing in hosts file
Adding 1 mapping(s) in hosts file...
❯ (echo 127.0.0.1 local.example) >> C:\\Windows\\System32\\Drivers\\etc\\hosts
Password:
✔ mappings added to hosts file
```

_Second execution logs_

```console
> node ./verify_hosts.mjs

Check hosts file content...
✔ all ip mappings found in hosts file
```

</details>
