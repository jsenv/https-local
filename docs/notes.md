| Tool    | How to trust root cert                                                                      |
| ------- | ------------------------------------------------------------------------------------------- |
| Firefox | https://wiki.mozilla.org/PSM:Changing_Trust_Settings                                        |
| Mac     | https://support.apple.com/guide/keychain-access/add-certificates-to-a-keychain-kyca2431/mac |

See also https://github.com/BenMorel/dev-certificates

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
