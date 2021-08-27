import { createRequire } from "node:module"

import { exec } from "../exec.js"

import { HOSTS_FILE_PATH } from "./hosts_utils.js"

export const writeHostsFile = async (
  hostsFileContent,
  { hostsFilePath = HOSTS_FILE_PATH, onBeforeExecCommand = () => {} } = {},
) => {
  if (process.platform === "win32") {
    return writeHostsFileOnWindows({ hostsFileContent, hostsFilePath, onBeforeExecCommand })
  }
  return writeHostsFileOnLinuxOrMac({ hostsFileContent, hostsFilePath, onBeforeExecCommand })
}

const writeHostsFileOnLinuxOrMac = async ({
  hostsFilePath,
  hostsFileContent,
  onBeforeExecCommand,
}) => {
  const needsSudo = hostsFilePath === HOSTS_FILE_PATH
  // https://en.wikipedia.org/wiki/Tee_(command)
  const updateHostsFileCommand = needsSudo
    ? `echo "${hostsFileContent}" | sudo tee ${hostsFilePath}`
    : `echo "${hostsFileContent}" | tee ${hostsFilePath}`
  onBeforeExecCommand(updateHostsFileCommand)

  await exec(updateHostsFileCommand)
}

const writeHostsFileOnWindows = async ({
  hostsFilePath,
  hostsFileContent,
  onBeforeExecCommand,
}) => {
  const needsSudo = hostsFilePath === HOSTS_FILE_PATH
  const updateHostsFileCommand = `echo ${hostsFileContent} | tree -filepath ${hostsFilePath}`

  if (needsSudo) {
    const require = createRequire(import.meta.url)
    const sudoPrompt = require("sudo-prompt")
    onBeforeExecCommand(updateHostsFileCommand)
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
