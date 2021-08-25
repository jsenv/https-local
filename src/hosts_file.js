import { createDetailedMessage, createLogger } from "@jsenv/logger"
import { readFile } from "@jsenv/filesystem"

import { parseHosts } from "./internal/hosts_parser.js"
import { okSign, infoSign, commandSign, warningSign, failureSign } from "./internal/logs.js"
import { exec } from "./internal/exec.js"
import { importSudoPrompt } from "./internal/sudo_prompt.js"

const isWindows = process.platform === "win32"

export const ensureIpMappingsInHostsFile = async ({
  ipMappings,
  logLevel,
  logger = createLogger({ logLevel }),
  tryToUpdateHostsFile = false,
  // for unit test
  hostsFilePath,
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

  logger.info(`Adding ${missingMappingCount} mapping(s) in hosts file...`)
  try {
    await writeSudoFile({
      hostsFilePath,
      hostsFileContent: newHostsFileContent,
      logger,
    })
    logger.info(`${okSign} mappings added to hosts file`)
  } catch (e) {
    logger.error(`${failureSign} error while updating hosts file`, {
      "error stack": e.stack,
    })
  }
}

const writeSudoFile = async ({ hostsFilePath, hostsFileContent, logger }) => {
  if (process.platform === "win32") {
    return writeSudoFileOnWindows({ hostsFilePath, hostsFileContent, logger })
  }
  return writeSudoFileOnLinuxOrMac({ hostsFilePath, hostsFileContent, logger })
}

const writeSudoFileOnLinuxOrMac = async ({ hostsFilePath, hostsFileContent, logger }) => {
  const needsSudo = hostsFilePath === "/etc/hosts"
  // https://en.wikipedia.org/wiki/Tee_(command)
  const updateHostsFileCommand = needsSudo
    ? `echo "${hostsFileContent}" | sudo tee ${hostsFilePath}`
    : `echo "${hostsFileContent}" | tee ${hostsFilePath}`
  logger.info(`${commandSign} ${updateHostsFileCommand}`)
  await exec(updateHostsFileCommand)
}

const writeSudoFileOnWindows = async ({ hostsFilePath, hostsFileContent, logger }) => {
  const needsSudo = hostsFilePath === "C:\\Windows\\System32\\Drivers\\etc\\hosts"
  const updateHostsFileCommand = `echo ${hostsFileContent} | tree -filepath ${hostsFilePath}`

  if (needsSudo) {
    const sudoPrompt = await importSudoPrompt()
    logger.info(`${commandSign} ${updateHostsFileCommand}`)
    await new Promise((resolve, reject) => {
      sudoPrompt.exec(updateHostsFileCommand, (error, stdout, stderr) => {
        if (error) {
          reject(error)
        } else if (typeof stderr === "string" && stderr.trim().length > 0) {
          reject(stderr)
        } else {
          resolve(stdout)
        }
      })
    })
    return
  }

  await exec(updateHostsFileCommand)
}

const formatXMappingMissingMessage = (missingMappingCount) => {
  if (missingMappingCount) {
    return `1 mapping is missing in hosts file`
  }

  return `${missingMappingCount} mappings are missing in hosts file`
}
