import { requestCertificateForLocalhost } from "@jsenv/https-localhost"
import {
  TEST_PARAMS,
  resetAllCertificateFiles,
  createLoggerForTest,
  startServerForTest,
} from "@jsenv/https-localhost/test/test_helpers.mjs"

const serverCertificateFileUrl = new URL("./certificate/server.crt", import.meta.url)
const loggerForCall = createLoggerForTest({
  forwardToConsole: true,
})
const firstCallParams = {
  ...TEST_PARAMS,
  logger: loggerForCall,
  serverCertificateFileUrl,
  tryToTrustRootCertificate: true,
}

await resetAllCertificateFiles()
const { serverCertificate, serverPrivateKey } = await requestCertificateForLocalhost(
  firstCallParams,
)

const serverOrigin = await startServerForTest({
  port: 4456,
  serverCertificate,
  serverPrivateKey,
  keepAlive: true,
})
console.log(`Open ${serverOrigin} in a browser`)
