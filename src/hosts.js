import { createDetailedMessage, createLogger } from "@jsenv/logger"
import { readFile } from "@jsenv/filesystem"

import { parseHosts } from "./internal/hosts_parser.js"
import { okSign, infoSign, commandSign, warningSign, failureSign } from "./internal/logs.js"
import { exec } from "./internal/exec.js"

const isWindows = process.platform === "win32"
const HOSTS_FILE_PATH = isWindows ? "C:\\Windows\\System32\\Drivers\\etc\\hosts" : "/etc/hosts"

export const ensureIpMappingsInHostsFile = async ({
  ipMappings,
  logLevel,
  logger = createLogger({ logLevel }),
  tryToUpdateHostsFile = false,
  // for unit test
  hostsFilePath = HOSTS_FILE_PATH,
}) => {
  logger.info(`Check hosts files content...`)

  const hostsFileContent = await readFile(hostsFilePath, { as: "string" })
  logger.debug(`Parsing hosts file content...`)
  const hostnames = parseHosts(hostsFileContent)

  const missingIpMappings = {}
  let missingMappingCount = 0
  Object.keys(ipMappings).forEach((ip) => {
    const ipHostnames = ipMappings[ip]
    if (!Array.isArray(ipHostnames)) {
      throw new TypeError(`ipMappings values must be an array, found ${ipHostnames} for ${ip}`)
    }

    const existingMappings = hostnames.getIpHostnames(ip)
    const missingMappings = existingMappings.filter((ipHostname) => {
      return !existingMappings.includes(ipHostname)
    })
    if (missingMappings.length) {
      missingIpMappings[ip] = missingMappings
      missingMappingCount += missingMappings.length
    }
  })
  if (missingMappingCount === 0) {
    logger.info(`${okSign} all ip mappings found in hosts file`)
    return
  }

  logger.info(`${infoSign} ${formatXMappingMissingMessage(missingMappingCount)}`)

  Object.keys(missingIpMappings).forEach((ip) => {
    missingIpMappings[ip].forEach((hostname) => {
      hostnames.addIpHostname(ip, hostname)
    })
  })
  const newHostsFileContent = hostnames.asFileContent()

  if (isWindows && tryToUpdateHostsFile) {
    // we could but it requires a sudo prompt + running echo command to write the file
    // see https://github.com/davewasmer/devcert/blob/fecd645e89b977fbe941ca520c4ce27d1fd8bea6/src/platforms/win32.ts#L61
    logger.debug(`Cannot try to register hostname on windows`)
    tryToUpdateHostsFile = false
  }

  if (!tryToUpdateHostsFile) {
    logger.warn(
      createDetailedMessage(`${warningSign} you should update your hosts file`, {
        "hosts file path": hostsFilePath,
        "suggested hosts file content": newHostsFileContent,
      }),
    )
    return
  }

  // https://en.wikipedia.org/wiki/Tee_(command)
  const updateHostFileCommand = `sudo tee ${hostsFilePath}`
  logger.info(`Adding ${missingMappingCount} mapping(s) in hosts file...`)
  logger.info(`${commandSign} ${updateHostFileCommand}`)
  logger.debug(`Hosts file info`, {
    "hosts file content": newHostsFileContent,
    "hosts file": hostsFilePath,
  })
  try {
    await exec(updateHostFileCommand, { input: newHostsFileContent })
    logger.info(`${okSign} mappings added to hosts file`)
  } catch (e) {
    logger.error(`${failureSign} error while updating hosts file`, {
      "error stack": e.stack,
    })
  }
}

const formatXMappingMissingMessage = (missingMappingCount) => {
  if (missingMappingCount) {
    return `1 mapping is missing in hosts file`
  }

  return `${missingMappingCount} mappings are missing in hosts file`
}
