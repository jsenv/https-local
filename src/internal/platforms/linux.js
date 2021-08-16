/*
 * see https://github.com/davewasmer/devcert/blob/master/src/platforms/linux.ts
 */

import { existsSync } from "node:fs"
import { readFile } from "@jsenv/filesystem"

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

  const copyCertificateFileCommand = `sudo cp ${rootCertificateFilePath} /usr/local/share/ca-certificates/jsenv_certificate_authority.crt`
  const updateCertificateAuthoritiesCommand = `sudo update-ca-certificates`
  return {
    description: "add root certificate to Linux trust store",
    fixable: true,
    fix: async () => {
      await exec(copyCertificateFileCommand)
      await exec(updateCertificateAuthoritiesCommand)
    },
  }
}

export const rootCertificateIsRegistered = async ({ logger, rootCertificatePEM }) => {
  logger.debug(`Searching root certificate in linux trust store`)
  if (!existsSync(`/usr/local/share/ca-certificates/jsenv_certificate_authority.crt`)) {
    logger.debug(`Root certificate is not in linux store`)
    return false
  }

  logger.debug(
    `Root certificate found at /usr/local/share/ca-certificates/jsenv_certificate_authority.crt`,
  )
  const rootCertificatePEMInLinuxStore = await readFile(
    `/usr/local/share/ca-certificates/jsenv_certificate_authority.crt`,
  )
  if (rootCertificatePEMInLinuxStore === rootCertificatePEM) {
    logger.debug(`Root certificate already in linux store`)
    return true
  }
  logger.debug(`Root certificate in linux store is outdated`)
  return false
}

export const removeRootCertificateFileFromTrustStore = async () => {
  const removeCertificateFileCommand = `sudo rm /usr/local/share/ca-certificates/jsenv_certificate_authority.crt`
  const updateCertificateAuthoritiesCommand = `sudo update-ca-certificates`
  return {
    description: "remove root certificate from Linux trust store",
    fixable: true,
    fix: async () => {
      await exec(removeCertificateFileCommand)
      await exec(updateCertificateAuthoritiesCommand)
    },
  }
}

export const isFirefoxInstalled = () => {
  return existsSync("/usr/bin/firefox")
}
