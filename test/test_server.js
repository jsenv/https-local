import { createServer } from "node:http"

export const startServerForTest = async ({
  serverCertificate,
  serverPrivateKey,
  keepAlive = false,
  port = 0,
}) => {
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
  if (!keepAlive) {
    server.unref()
  }
  const serverPort = await new Promise((resolve) => {
    server.on("listening", () => {
      // in case port is 0 (randomly assign an available port)
      // https://nodejs.org/api/net.html#net_server_listen_port_host_backlog_callback
      resolve(server.address().port)
    })
    server.listen(port)
  })
  return `https://localhost:${serverPort}`
}
