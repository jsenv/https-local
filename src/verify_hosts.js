import { createDetailedMessage, createLogger } from "@jsenv/logger"

import { okSign, infoSign, warningSign, failureSign, commandSign } from "./internal/logs.js"
import { HOSTS_FILE_PATH, readHostsFile, parseHosts, writeHostsFile } from "./internal/hosts.js"

export const verifyHostsFile = async ({
  ipMappings,
  logLevel,
  logger = createLogger({ logLevel }),
  tryToUpdateHostsFile = false,
  // for unit test
  hostsFilePath = HOSTS_FILE_PATH,
}) => {
  logger.info(`Check hosts files content...`)

  const hostsFileContent = await readHostsFile(hostsFilePath)
  const hostnames = parseHosts(hostsFileContent)

  const missingIpMappings = {}
  let missingMappingCount = 0
  Object.keys(ipMappings).forEach((ip) => {
    const ipHostnames = ipMappings[ip]
    if (!Array.isArray(ipHostnames)) {
      throw new TypeError(`ipMappings values must be an array, found ${ipHostnames} for ${ip}`)
    }
    const existingMappings = hostnames.getIpHostnames(ip)
    const missingMappings = ipHostnames.filter((ipHostname) => {
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

  Object.keys(missingIpMappings).forEach((ip) => {
    missingIpMappings[ip].forEach((hostname) => {
      hostnames.addIpHostname(ip, hostname)
    })
  })
  const newHostsFileContent = hostnames.asFileContent()

  if (!tryToUpdateHostsFile) {
    logger.warn(
      createDetailedMessage(`${warningSign} ${formatXMappingMissingMessage(missingMappingCount)}`, {
        "hosts file path": hostsFilePath,
        "suggested hosts file content": newHostsFileContent,
      }),
    )
    return
  }

  logger.info(`${infoSign} ${formatXMappingMissingMessage(missingMappingCount)}`)
  logger.info(`Adding ${missingMappingCount} mapping(s) in hosts file...`)
  try {
    await writeHostsFile(newHostsFileContent, {
      hostsFilePath,
      onBeforeExecCommand: (command) => {
        logger.info(`${commandSign} ${command}`)
      },
    })

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
