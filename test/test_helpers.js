import { createServer } from "node:https"
import { createRequire } from "node:module"
import { removeFileSystemNode } from "@jsenv/filesystem"

import { getCertificateAuthorityFileUrls } from "@jsenv/https-localhost/src/internal/certificate_authority_file_urls.js"

const require = createRequire(import.meta.url)

export const resetCertificateAuhtorityFiles = async () => {
  const { certificateAuthorityJsonFileUrl, rootCertificateFileUrl, rootPrivateKeyFileUrl } =
    getCertificateAuthorityFileUrls()

  // maybe we could/should just use ensureEmptyDirectory on the certificate autorithy directory
  await removeFileSystemNode(certificateAuthorityJsonFileUrl, { allowUseless: true })
  await removeFileSystemNode(rootCertificateFileUrl, { allowUseless: true })
  await removeFileSystemNode(rootPrivateKeyFileUrl, { allowUseless: true })
}

/*
 * Logs are an important part of this package
 * For this reason tests msut be capable to ensure which logs are displayed
 * and their content. This file provide a logger capable to do that.
 */
export const createLoggerForTest = ({ forwardToConsole = false } = {}) => {
  const debugs = []
  const infos = []
  const warns = []
  const errors = []

  return {
    debug: (...args) => {
      debugs.push(args.join(""))
      if (forwardToConsole) {
        console.debug(...args)
      }
    },
    info: (...args) => {
      infos.push(args.join(""))
      if (forwardToConsole) {
        console.info(...args)
      }
    },
    warn: (...args) => {
      warns.push(args.join(""))
      if (forwardToConsole) {
        console.warn(...args)
      }
    },
    error: (...args) => {
      errors.push(args.join(""))
      if (forwardToConsole) {
        console.error(...args)
      }
    },

    getLogs: (
      { debug, info, warn, error } = {
        debug: true,
        info: true,
        warn: true,
        error: true,
      },
    ) => {
      return {
        ...(debug ? { debugs } : {}),
        ...(info ? { infos } : {}),
        ...(warn ? { warns } : {}),
        ...(error ? { errors } : {}),
      }
    },
  }
}

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

export const launchChromium = () => {
  const { chromium } = require("playwright")
  return chromium.launch()
}

export const launchFirefox = () => {
  const { firefox } = require("playwright")
  return firefox.launch()
}

export const launchWebkit = () => {
  const { webkit } = require("playwright")
  return webkit.launch()
}

export const requestServerUsingBrowser = async ({ serverOrigin, browser }) => {
  const page = await browser.newPage()

  return new Promise(async (resolve, reject) => {
    page.on("requestfailed", (request) => {
      reject(request.failure())
    })

    page.on("load", () => {
      setTimeout(resolve, 200) // this time is required for firefox to trigger "requestfailed"
    })

    page.goto(serverOrigin).catch((e) => {
      // chrome
      if (e.message.includes("ERR_CERT_INVALID")) {
        return
      }
      // firefox
      if (e.message.includes("SEC_ERROR_UNKNOWN_ISSUER")) {
        return
      }
      // webkit
      if (e.message.includes("The certificate for this server is invalid.")) {
        return
      }
      throw e
    })
  })
}
