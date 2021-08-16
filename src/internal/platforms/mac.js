/*
 * see
 * - https://github.com/davewasmer/devcert/blob/master/src/platforms/darwin.ts
 * - https://www.unix.com/man-page/mojave/1/security/
 */

import { existsSync } from "node:fs"
import { createDetailedMessage } from "@jsenv/logger"
import { readFile } from "@jsenv/filesystem"

import { parseHosts } from "../hosts_parser.js"
import { exec } from "../exec.js"

export const ensureRootCertificateRegistration = async ({
  logger,
  rootCertificateFilePath,
  rootCertificateStatus,
  rootCertificate,
  tryToTrustRootCertificate,
}) => {
  logger.debug(`Searching root certificate in macOS keychain`)
  const findAllCertificatesCommand = `security find-certificate -a -p`
  logger.debug(`> ${findAllCertificatesCommand}`)
  const stringWithAllCertificatesAsPem = await exec(findAllCertificatesCommand)
  const rootCertificateInKeychain = stringWithAllCertificatesAsPem.includes(rootCertificate)

  if (rootCertificateInKeychain) {
    logger.debug(`root certificate found in macOS keychain`)
  } else {
    const addTrustedCertificateCommand = `sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain -p ssl -p basic ${rootCertificateFilePath}`
    if (tryToTrustRootCertificate) {
      logger.debug(`root certificate is not in macOS keychain`)
      logger.info(`adding root certificate to macOS keychain`)
      logger.info(`> ${addTrustedCertificateCommand}`)
      try {
        await exec(addTrustedCertificateCommand)
      } catch (e) {
        logger.error(
          createDetailedMessage(`failed to add ${rootCertificateFilePath} to macOS keychain`, {
            "error stack": e.stack,
          }),
        )
      }
    } else {
      logger.info(`
${createDetailedMessage(`root certificate must be added to macOS keychain`, {
  suggestion: addTrustedCertificateCommand,
  documentation: `https://support.apple.com/guide/keychain-access/add-certificates-to-a-keychain-kyca2431/mac`,
})}
`)
    }
  }

  if (isFirefoxInstalled()) {
    if (rootCertificateStatus === "reused") {
      logger.debug(`Root certificate reused, skip "how to trust for firefox" log`)
    } else {
      logger.info(`
${createDetailedMessage(`Firefox detected, root certificate needs to be trusted in Firefox`, {
  suggestion: "https://wiki.mozilla.org/PSM:Changing_Trust_Settings",
})}
`)
    }
  } else {
    logger.debug(`Firefox not detected`)
  }
}

const isFirefoxInstalled = () => {
  return existsSync("/Applications/Firefox.app")
}

export const ensureHostnamesRegistration = async ({ logger, serverCertificateAltNames }) => {
  if (serverCertificateAltNames.length === 0) {
    logger.debug(`serverCertificateAltNames is empty -> skip ensureHostnamesRegistration`)
    return
  }

  logger.debug(`Reading /etc/hosts file`)
  const hostsFileContent = await readFile("/etc/hosts", { as: "string" })
  logger.debug(`Parsing /etc/hosts file content`)
  const hostnames = parseHosts(hostsFileContent)
  const selfIpHostnames = hostnames.getIpHostnames("127.0.0.1")
  const missingHostnames = serverCertificateAltNames.filter((serverCertificateAltName) => {
    return !selfIpHostnames.includes(serverCertificateAltName)
  })
  const missingHostnameCount = missingHostnames.length
  if (missingHostnameCount === 0) {
    logger.debug(``)
    return
  }

  logger.info(`${missingHostnameCount} hostnames needs to be remapped to 127.0.0.1`)
  missingHostnames.forEach((missingHostname) => {
    hostnames.addIpHostname("127.0.0.1", missingHostname)
  })
  const newHostsFileContent = hostnames.asFileContent()
  // https://en.wikipedia.org/wiki/Tee_(command)
  const updateHostFileCommand = `sudo tee /etc/hosts`
  logger.info(`> ${updateHostFileCommand}

${newHostsFileContent}

`)
  await exec(updateHostFileCommand, { input: newHostsFileContent })
}
