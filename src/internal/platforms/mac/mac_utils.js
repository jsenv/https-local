import { existsSync } from "node:fs"
import { assertAndNormalizeDirectoryUrl, resolveUrl, urlToFileSystemPath } from "@jsenv/filesystem"

import { memoize } from "@jsenv/https-localhost/src/internal/memoize.js"
import { exec } from "@jsenv/https-localhost/src/internal/exec.js"
import { infoSign, okSign } from "@jsenv/https-localhost/src/internal/logs.js"

export const detectNSSCommand = async ({ logger }) => {
  logger.debug(`Detecting nss command....`)
  const brewListCommand = `brew list -1`

  try {
    const brewListCommandOutput = await exec(brewListCommand)
    const nssFound = brewListCommandOutput.includes("\nnss\n")
    logger.debug(`${okSign} nss command detected`)
    return nssFound
  } catch (e) {
    logger.debug(`${infoSign} nss command not detected`)
    return false
  }
}

export const getCertutilBinPath = memoize(async () => {
  const brewCommand = `brew --prefix nss`
  const brewCommandOutput = await exec(brewCommand)
  const nssCommandDirectoryUrl = assertAndNormalizeDirectoryUrl(brewCommandOutput.trim())
  const certutilBinUrl = resolveUrl(`./bin/certutil`, nssCommandDirectoryUrl)
  const certutilBinPath = urlToFileSystemPath(certutilBinUrl)
  return certutilBinPath
})

export const detectFirefox = ({ logger }) => {
  logger.debug(`Detecting Firefox...`)

  const firefoxDetected = existsSync("/Applications/Firefox.app")
  if (firefoxDetected) {
    logger.debug(`${okSign} Firefox detected`)
    return true
  }

  logger.debug(`${infoSign} Firefox not detected`)
  return false
}

export const firefoxNSSDBDirectoryUrl = resolveUrl(
  `./Library/Application Support/Firefox/Profiles/`,
  assertAndNormalizeDirectoryUrl(process.env.HOME),
)
