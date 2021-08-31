import { createDetailedMessage, createLogger } from "@jsenv/logger"

import { okSign, infoSign, warningSign, commandSign } from "./internal/logs.js"
import {
  HOSTS_FILE_PATH,
  readHostsFile,
  parseHosts,
  writeLineInHostsFile,
} from "./internal/hosts.js"

export const verifyHostsFile = async ({
  ipMappings,
  logLevel,
  logger = createLogger({ logLevel }),
  tryToUpdateHostsFile = false,
  // for unit test
  hostsFilePath = HOSTS_FILE_PATH,
}) => {
  logger.info(`Check hosts file content...`)
  const hostsFileContent = await readHostsFile(hostsFilePath)
  const hostnames = parseHosts(hostsFileContent)

  const missingMappings = []
  Object.keys(ipMappings).forEach((ip) => {
    const ipHostnames = ipMappings[ip]
    if (!Array.isArray(ipHostnames)) {
      throw new TypeError(`ipMappings values must be an array, found ${ipHostnames} for ${ip}`)
    }
    const existingMappings = hostnames.getIpHostnames(ip)
    const missingHostnames = normalizeHostnames(ipHostnames).filter(
      (hostname) => !existingMappings.includes(hostname),
    )
    if (missingHostnames.length) {
      missingMappings.push({ ip, missingHostnames })
    }
  })
  const missingMappingCount = missingMappings.length
  if (missingMappingCount === 0) {
    logger.info(`${okSign} all ip mappings found in hosts file`)
    return
  }

  if (!tryToUpdateHostsFile) {
    const mappingsToAdd = missingMappings
      .map(({ ip, missingHostnames }) => `${ip} ${missingHostnames.join(" ")}`)
      .join("\n")
    logger.warn(
      createDetailedMessage(`${warningSign} ${formatXMappingMissingMessage(missingMappingCount)}`, {
        "hosts file path": hostsFilePath,
        "mappings to add": mappingsToAdd,
      }),
    )
    return
  }

  const EOL = process.platform === "win32" ? "\r\n" : "\n"

  logger.info(`${infoSign} ${formatXMappingMissingMessage(missingMappingCount)}`)
  await Promise.all(
    missingMappings.map(async ({ ip, missingHostnames }, index) => {
      const mapping = `${ip} ${missingHostnames.join(" ")}`
      logger.info(`Append "${mapping}" in host file...`)

      const prefixWithNewLine =
        index === 0 &&
        // on windows the string to echo cannot contain EOL
        process.platform !== "win32" &&
        hostsFileContent.length > 0 &&
        !hostsFileContent.endsWith(EOL)
      await writeLineInHostsFile(`${prefixWithNewLine ? EOL : ""}${mapping}`, {
        hostsFilePath,
        onBeforeExecCommand: (command) => {
          logger.info(`${commandSign} ${command}`)
        },
      })
      logger.info(`${okSign} mapping added`)
    }),
  )
}

const normalizeHostnames = (hostnames) => {
  return hostnames.map((hostname) => hostname.trim().replace(/[\s;]/g, ""))
}

const formatXMappingMissingMessage = (missingMappingCount) => {
  if (missingMappingCount) {
    return `1 mapping is missing in hosts file`
  }

  return `${missingMappingCount} mappings are missing in hosts file`
}
