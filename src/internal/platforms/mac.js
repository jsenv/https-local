/*
 * see
 * - https://github.com/davewasmer/devcert/blob/master/src/platforms/darwin.ts
 * - https://www.unix.com/man-page/mojave/1/security/
 */

import { existsSync } from "node:fs"
import { createDetailedMessage } from "@jsenv/logger"
import { readFile, urlToFileSystemPath } from "@jsenv/filesystem"

import { parseHosts } from "../hosts_parser.js"
import { exec } from "../exec.js"

export const ensureRootCertificateRegistration = async ({
  logger,
  rootCertificateFileUrl,
  rootCertificateSymlinkUrl,
  rootCertificateStatus,
  rootCertificate,

  tryToTrustRootCertificate,
}) => {
  const findAllCertificatesCommand = `security find-certificate -a -p`
  logger.debug(`
Searching root certificate in macOS keychain
> ${findAllCertificatesCommand}
`)
  const stringWithAllCertificatesAsPem = await exec(findAllCertificatesCommand)
  const rootCertificateInKeychain = stringWithAllCertificatesAsPem.includes(rootCertificate)

  if (rootCertificateInKeychain) {
    logger.debug(`Root certificate found in macOS keychain`)
  } else {
    const addTrustedCertificateCommand = `sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain -p ssl -p basic "${urlToFileSystemPath(
      rootCertificateFileUrl,
    )}"`
    if (tryToTrustRootCertificate) {
      logger.debug(`Root certificate is not in macOS keychain`)
      logger.info(`
Adding root certificate to macOS keychain
> ${addTrustedCertificateCommand}
`)
      try {
        await exec(addTrustedCertificateCommand)
      } catch (e) {
        logger.error(
          createDetailedMessage(`Failed to add root certificate to macOS keychain`, {
            "error stack": e.stack,
            "root certificate file url": rootCertificateFileUrl,
          }),
        )
      }
    } else {
      logger.info(`
${createDetailedMessage(`Root certificate must be added to macOS keychain`, {
  "root certificate file": urlToFileSystemPath(rootCertificateSymlinkUrl),
  "suggested documentation": `https://support.apple.com/guide/keychain-access/add-certificates-to-a-keychain-kyca2431/mac`,
  "suggested command": addTrustedCertificateCommand,
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
  "root certificate file": urlToFileSystemPath(rootCertificateSymlinkUrl),
  "suggested documentation": "https://wiki.mozilla.org/PSM:Changing_Trust_Settings",
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

export const ensureHostnamesRegistration = async ({
  logger,
  serverCertificateAltNames,
  tryToRegisterHostnames,
  hostsFilePath = "/etc/hosts",
}) => {
  if (serverCertificateAltNames.length === 0) {
    logger.debug(`serverCertificateAltNames is empty -> skip ensureHostnamesRegistration`)
    return
  }

  logger.debug(`Reading hosts file at ${hostsFilePath}`)
  const hostsFileContent = await readFile(hostsFilePath, { as: "string" })
  logger.debug(`Parsing hosts file content`)
  const hostnames = parseHosts(hostsFileContent)
  const selfIpHostnames = hostnames.getIpHostnames("127.0.0.1")
  const missingHostnames = serverCertificateAltNames.filter((serverCertificateAltName) => {
    return !selfIpHostnames.includes(serverCertificateAltName)
  })
  const missingHostnameCount = missingHostnames.length
  if (missingHostnameCount === 0) {
    logger.debug(`All hostnames mappings found in hosts file`)
    return
  }

  missingHostnames.forEach((missingHostname) => {
    hostnames.addIpHostname("127.0.0.1", missingHostname)
  })
  const newHostsFileContent = hostnames.asFileContent()

  if (tryToRegisterHostnames) {
    // https://en.wikipedia.org/wiki/Tee_(command)
    const updateHostFileCommand = `sudo tee ${hostsFilePath}`
    logger.info(`
Adding ${missingHostnameCount} mapping(s) in your hosts file
> ${updateHostFileCommand}
`)
    logger.debug(`Writing hosts info`, {
      "hostnames to add": missingHostnames,
      "hosts file content": newHostsFileContent,
      "hosts file": hostsFilePath,
    })
    await exec(updateHostFileCommand, { input: newHostsFileContent })
  } else {
    logger.info(`
${createDetailedMessage(`${missingHostnameCount} mapping(s) must be added in your hosts file`, {
  "hostnames to add": missingHostnames,
  "hosts file": hostsFilePath,
  "suggested hosts file content": newHostsFileContent,
})}`)
  }
}
