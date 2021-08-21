import { createRequire } from "node:module"
import { startServerForTest } from "../../test/test_helpers.mjs"

const require = createRequire(import.meta.url)

const devcert = require("devcert")

await devcert.uninstall()
const { key, cert } = await devcert.certificateFor(["localhost", "toto"], { getCaPath: true })

const serverOrigin = await startServerForTest({
  port: 5556,
  serverCertificate: cert,
  serverPrivateKey: key,
  keepAlive: true,
})
console.log(`Open ${serverOrigin} in a browser`)
