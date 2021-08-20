import { createDetailedMessage } from "@jsenv/logger"
import { urlToFileSystemPath } from "@jsenv/filesystem"

export const ensureHostnamesRegistration = ({ logger, serverCertificateAltNames }) => {
  const hostnames = serverCertificateAltNames

  logger.info(`
${createDetailedMessage(`${hostnames.length} hostname(s) must be mapped to 127.0.0.1`, {
  hostnames,
})}`)
}

export const ensureRootCertificateRegistration = ({
  logger,
  rootCertificateStatus,
  rootCertificateFileUrl,
}) => {
  if (rootCertificateStatus === "reused") {
    logger.debug(`Root certificate reused, skip "needs to trust" log`)
  } else {
    logger.info(`
${createDetailedMessage(`Root certificate needs to be trusted in your OS and browsers`, {
  "root certificate file": urlToFileSystemPath(rootCertificateFileUrl),
})}
`)
  }
}
