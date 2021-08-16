/*
 * see
 * - https://github.com/davewasmer/devcert/blob/master/src/platforms/darwin.ts
 * - https://www.unix.com/man-page/mojave/1/security/
 */

import { existsSync } from "node:fs"

import { exec } from "../exec.js"

export const describeHowToRegisterRootCertificate = async ({
  logger,
  rootCertificateFilePath,
  rootCertificatePEM,
}) => {
  const isRegistered = await rootCertificateIsRegistered({ logger, rootCertificatePEM })
  if (isRegistered) {
    return null
  }

  const addTrustedCertificateCommand = `sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain -p ssl -p basic ${rootCertificateFilePath}`
  return {
    description: "add root certificate to macOS keychain",
    fixable: true,
    fix: () => exec(addTrustedCertificateCommand),
  }
}

export const rootCertificateIsRegistered = async ({ logger, rootCertificatePEM }) => {
  logger.debug(`Searching root certificate in macOS keychain`)
  const findAllCertificatesCommand = `security find-certificate -a -p`
  logger.debug(`> ${findAllCertificatesCommand}`)
  const stringWithAllCertificatesAsPem = await exec(findAllCertificatesCommand)
  const rootCertificateInKeychain = stringWithAllCertificatesAsPem.includes(rootCertificatePEM)
  return rootCertificateInKeychain
}

export const describeHowToUnregisterRootCertificate = async ({ rootCertificateFilePath }) => {
  const removeTrustedCertificateCommand = `sudo security remove-trusted-cert -d ${rootCertificateFilePath}`

  return {
    description: "remove root certificate from macOS system keychain",
    fixable: true,
    fix: () => exec(removeTrustedCertificateCommand),
  }
}

export const isFirefoxInstalled = () => {
  return existsSync("/Applications/Firefox.app")
}
