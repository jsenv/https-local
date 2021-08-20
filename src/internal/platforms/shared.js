import { createDetailedMessage } from "@jsenv/logger"
import { readFile } from "@jsenv/filesystem"

import { parseHosts } from "../hosts_parser.js"
import { exec } from "../exec.js"

const isWindows = process.platform === "win32"

export const ensureHostnamesRegistration = async ({
  logger,
  serverCertificateAltNames,
  tryToRegisterHostnames,
  hostsFilePath = isWindows ? "C:\\Windows\\System32\\Drivers\\etc\\hosts" : "/etc/hosts",
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

  if (isWindows && tryToRegisterHostnames) {
    // we could but it requires a sudo prompt + running echo command to write the file
    // see https://github.com/davewasmer/devcert/blob/fecd645e89b977fbe941ca520c4ce27d1fd8bea6/src/platforms/win32.ts#L61
    logger.debug(`Cannot try to register hostname on windows`)
    tryToRegisterHostnames = false
  }

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