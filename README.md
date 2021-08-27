# Https localhost

Generate https certificate to use for a server running on localhost.

[![npm package](https://img.shields.io/npm/v/@jsenv/https-localhost.svg?logo=npm&label=package)](https://www.npmjs.com/package/@jsenv/https-localhost)
[![github main](https://github.com/jsenv/https-localhost/workflows/main/badge.svg)](https://github.com/jsenv/https-localhost/actions?workflow=main)
[![codecov coverage](https://codecov.io/gh/jsenv/https-localhost/branch/main/graph/badge.svg)](https://codecov.io/gh/jsenv/https-localhost)

# Presentation

`@jsenv/https-localhost` helps you to get certificates for your local server running in HTTPS.
Works on mac, linux and windows.

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

# installCertificateAuthority

_installCertificateAuthority_ function generates a certificate authority valid for 20 years.

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

After that re-executing the function gives different logs.

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

# verifyHostsFile

_verifyHostsFile_ function check your hosts file content to see if ip mappings are present.

```js
import { verifyHostsFile } from "@jsenv/https-localhost"

await verifyHostsFile({
  ipMappings: {
    "127.0.0.1": ["localhost", "local.example.com"],
  },
})
```

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
import { verifyHostsFile } from "@jsenv/https-localhost"

await verifyHostsFile({
  ipMappings: {
    "127.0.0.1": ["localhost", "local.example.com"],
  },
  tryToUpdateHostsFile: true,
})
```

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

After that re-executing the function gives different logs.

```console
> node ./verify_hosts.mjs

Check hosts file content...
✔ all ip mappings found in hosts file
```

# requestCertificateForLocalhost

# Installation

```console
npm install --save-dev @jsenv/https-localhost
```
