import { assert } from "@jsenv/assert"
import { readFile, urlToFileSystemPath, writeFile } from "@jsenv/filesystem"

import { verifyHostsFile } from "@jsenv/local-https-certificates"
import { infoSign, commandSign, okSign } from "@jsenv/local-https-certificates/src/internal/logs.js"
import { createLoggerForTest } from "@jsenv/local-https-certificates/test/test_helpers.mjs"

const hostFileUrl = new URL("./hosts", import.meta.url)
const hostsFilePath = urlToFileSystemPath(hostFileUrl)

// 1 ip mapping missing
{
  await writeFile(hostFileUrl, `127.0.0.1 localhost`)
  const loggerForTest = createLoggerForTest({
    // forwardToConsole: true,
  })
  await verifyHostsFile({
    logger: loggerForTest,
    ipMappings: {
      "127.0.0.1": ["localhost", "jsenv"],
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
      `Check hosts file content...`,
      `${infoSign} 1 mapping is missing in hosts file`,
      `Append "127.0.0.1 jsenv" in host file...`,
      process.platform === "win32"
        ? `${commandSign} (echo.& echo 127.0.0.1 jsenv) >> ${hostsFilePath}`
        : `${commandSign} echo "\n127.0.0.1 jsenv" | tee -a ${hostsFilePath}`,
      `${okSign} mapping added`,
    ],
    warns: [],
    errors: [],
  }
  assert({ actual, expected })
}

// 2 ip mapping missing
{
  await writeFile(hostFileUrl, ``)
  await verifyHostsFile({
    logLevel: "warn",
    ipMappings: {
      "127.0.0.1": ["localhost", "jsenv"],
      "192.168.1.1": ["toto"],
    },
    tryToUpdateHostsFile: true,
    hostsFilePath,
  })
  const hostsFileContent = await readFile(hostsFilePath, { as: "string" })
  const actual = hostsFileContent
  const expected =
    process.platform === "win32"
      ? `127.0.0.1 localhost jsenv\r\n192.168.1.1 toto\r\n`
      : `127.0.0.1 localhost jsenv\n192.168.1.1 toto\n`
  assert({ actual, expected })
}

// all hostname there
{
  const loggerForTest = createLoggerForTest({
    // forwardToConsole: true,
  })
  await writeFile(hostFileUrl, `127.0.0.1 jsenv`)
  await verifyHostsFile({
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
    infos: [`Check hosts file content...`, `${okSign} all ip mappings found in hosts file`],
    warns: [],
    errors: [],
  }
  assert({ actual, expected })
}
