# Local https certificates

A programmatic way to generate locally trusted certificates

[![npm package](https://img.shields.io/npm/v/@jsenv/local-https-certificates.svg?logo=npm&label=package)](https://www.npmjs.com/package/@jsenv/local-https-certificates)
[![github main](https://github.com/jsenv/local-https-certificates/workflows/main/badge.svg)](https://github.com/jsenv/local-https-certificates/actions?workflow=main)
[![codecov coverage](https://codecov.io/gh/jsenv/local-https-certificates/branch/main/graph/badge.svg)](https://codecov.io/gh/jsenv/local-https-certificates)

# Presentation

Generate certificate(s) trusted by your operating system and browsers.
This certificate can be used to start your development server in HTTPS.
Works on mac, linux and windows.

```js
import {
  installCertificateAuthority,
  verifyHostsFile,
  requestCertificateForLocalhost,
} from "@jsenv/local-https-certificates"

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

# installCertificateAuthority

_installCertificateAuthority_ function generates a certificate authority valid for 20 years.
This certificate authority is needed to generate local certificates that will be trusted by the operating system and web browsers.

```js
import { installCertificateAuthority } from "@jsenv/local-https-certificates"

await installCertificateAuthority()
```

Find below logs written in terminal when this function is executed.

<details>
  <summary>mac</summary>

```console
> node ./install_certificate_authority.mjs

ℹ authority root certificate not found in filesystem
Generating authority root certificate with a validity of 20 years...
✔ authority root certificate written at /Users/dmail/https_localhost/http_localhost_root_certificate.crt
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
  <summary>windows</summary>

```console
> node ./install_certificate_authority.mjs

ℹ authority root certificate not found in filesystem
Generating authority root certificate with a validity of 20 years...
✔ authority root certificate written at C:\Users\Dmail\AppData\Local\https_localhost\https_localhost_root_certificate.crt
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

By default it's up to you to trust authority root certificate.
It can also be done programmatically as explained the next part.

## Auto trust

It's possible to trust root certificate programmatically using _tryToTrust_

```js
import { installCertificateAuthority } from "@jsenv/local-https-certificates"

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
✔ authority root certificate written at /Users/dmail/https_localhost/https_localhost_root_certificate.crt
Adding certificate to mac keychain...
❯ sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain "/Users/dmail/https_localhost/https_localhost_root_certificate.crt"
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
Check if certificate is trusted by firefox...
ℹ unable to detect if certificate is trusted by firefox (not implemented on windows)
Adding certificate to windows...
❯ certutil -addstore -user root C:\Users\Dmail\AppData\Local\https_localhost\https_localhost_root_certificate.crt
✔ certificate added to windows
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

# verifyHostsFile

_verifyHostsFile_ function check your hosts file content to see if ip mappings are present.

```js
import { verifyHostsFile } from "@jsenv/local-https-certificates"

await verifyHostsFile({
  ipMappings: {
    "127.0.0.1": ["localhost", "local.example.com"],
  },
})
```

Find below logs written in terminal when this function is executed.

<details>
  <summary>mac</summary>

```console
> node ./verify_hosts.mjs

Check hosts file content...
⚠ 1 mapping is missing in hosts file
--- hosts file path ---
/etc/hosts
--- suggested hosts file content ---
##
# Host Database
#
#
# localhost is used to configure the loopback interface
# when the system is booting. Do not change this entry.
##
127.0.0.1	      localhost
255.255.255.255 broadcasthost
::1             localhost
127.0.0.1	      local.example.com
```

</details>

<details>
  <summary>windows</summary>

```console
> node ./verify_hosts.mjs

Check hosts file content...
⚠ 2 mappings are missing in hosts file
--- hosts file path ---
C:\\Windows\\System32\\Drivers\\etc\\hosts
--- suggested hosts file content ---
# Copyright (c) 1993-2006 Microsoft Corp.
#
# This is a sample HOSTS file used by Microsoft TCP/IP for Windows.
#
# This file contains the mappings of IP addresses to host names. Each
# entry should be kept on an individual line. The IP address should
# be placed in the first column followed by the corresponding host name.
# The IP address and the host name should be separated by at least one
# space.
#
# Additionally, comments (such as these) may be inserted on individual
# lines or following the machine name denoted by a '#' symbol.
#
# For example:
#
# 102.54.94.97 rhino.acme.com
# source server
# 38.25.63.10 x.acme.com
# x client host
# localhost name resolution is handle within DNS itself.
# 127.0.0.1 localhost
# ::1 localhost
127.0.0.1	      localhost
127.0.0.1	      local.example.com
```

</details>

## Auto update hosts

It's possible to update hosts file programmatically using _tryToUpdateHostsFile_.

```js
import { verifyHostsFile } from "@jsenv/local-https-certificates"

await verifyHostsFile({
  ipMappings: {
    "127.0.0.1": ["localhost", "local.example.com"],
  },
  tryToUpdateHostsFile: true,
})
```

<details>
  <summary>mac</summary>

```console
Check hosts file content...
ℹ 1 mapping is missing in hosts file
Adding 2 mapping(s) in hosts file...
❯ echo "##
# Host Database
#
#
# localhost is used to configure the loopback interface
# when the system is booting. Do not change this entry.
##
127.0.0.1	      localhost
255.255.255.255 broadcasthost
::1             localhost
127.0.0.1	      local.example.com
127.0.0.1       local.example.com
" | sudo tee /etc/hosts
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

# requestCertificateForLocalhost

_requestCertificateForLocalhost_ function returns a certificate and private key that can be used to start a server in HTTPS.

```js
import { createServer } from "node:https"
import { requestCertificateForLocalhost } from "@jsenv/local-https-certificates"

const { serverCertificate, serverCertificatePrivateKey } = await requestCertificateForLocalhost({
  serverCertificateAltNames: ["localhost", "local.example.com"],
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
console.log(`Server listening at https://localhost:8080`)
```

[installCertificateAuthority](#installCertificateAuthority) must be called before this function.

# Certificate expiration

The server certificate expires after one year which is the maximum duration allowed by web browsers.

In the unlikely scenario where your local server is running for more than a year without interruption, restart it and you're good for one more year.

The authority root certificate expires after 20 years which is close to the maximum allowed duration.

In the very unlikely scenario where you are using the same machine for more than 20 years, re-execute [installCertificateAuthority](#installCertificateAuthority) to update certificate authority and restart your server.

# Installation

```console
npm install --save-dev @jsenv/local-https-certificates
```
