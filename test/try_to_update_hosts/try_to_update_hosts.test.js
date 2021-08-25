import { assert } from "@jsenv/assert"
import { readFile, urlToFileSystemPath, writeFile } from "@jsenv/filesystem"

import { ensureIpMappingsInHostsFile } from "@jsenv/https-localhost"
import { infoSign, commandSign, okSign } from "@jsenv/https-localhost/src/internal/logs.js"
import { createLoggerForTest } from "@jsenv/https-localhost/test/test_helpers.mjs"

const hostFileUrl = new URL("./hosts", import.meta.url)
const hostsFilePath = urlToFileSystemPath(hostFileUrl)

// required and missing

await writeFile(hostFileUrl, `127.0.0.1 localhost`)
const loggerForTest = createLoggerForTest({
  // forwardToConsole: true,
})
await ensureIpMappingsInHostsFile({
  logger: loggerForTest,
  ipMappings: {
    "127.0.0.1": ["jsenv"],
  },
  tryToUpdateHostsFile: true,
  hostsFilePath,
})

const { infos, warns, errors } = loggerForTest.getLogs({ info: true, warn: true, error: true })
const hostsFileContent = await readFile(hostsFilePath, { as: "string" })
const actual = {
  hostsFileContent,
  infos,
  warns,
  errors,
}
const expected = {
  hostsFileContent:
    process.platform === "win32"
      ? `127.0.0.1 localhost\r\n127.0.0.1 jsenv\r\n`
      : `127.0.0.1 localhost\n127.0.0.1 jsenv\n`,
  infos: [
    `Check hosts files content...`,
    `${infoSign} 1 mapping is missing in hosts file`,
    `Adding 1 mapping(s) in hosts file...`,
    process.platform === "win32"
      ? `${commandSign} echo "127.0.0.1 localhost
127.0.0.1 jsenv" | tree -filepath ${hostsFilePath}`
      : `${commandSign} echo "127.0.0.1 localhost
127.0.0.1 jsenv" | tee ${hostsFilePath}`,
    `${okSign} mappings added to hosts file`,
  ],
  warns: [],
  errors: [],
}
assert({ actual, expected })

// required and exists
if (process.platform !== "win32") {
  const loggerForTest = createLoggerForTest({
    // forwardToConsole: true,
  })
  await writeFile(hostFileUrl, `127.0.0.1 jsenv`)
  await ensureIpMappingsInHostsFile({
    logger: loggerForTest,
    ipMappings: {
      "127.0.0.1": ["jsenv"],
    },
    tryToUpdateHostsFile: true,
    hostsFilePath,
  })

  const { infos, warns, errors } = loggerForTest.getLogs({ info: true, warn: true, error: true })
  const actual = {
    infos,
    warns,
    errors,
  }
  const expected = {
    infos: [`Check hosts files content...`, `${okSign} all ip mappings found in hosts file`],
    warns: [],
    errors: [],
  }
  assert({ actual, expected })
}
