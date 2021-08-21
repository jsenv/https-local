import { searchRootCertificateInNSSDBFiles } from "../nss_db_files.js"
import { detectFirefox, firefoxNSSDBDirectoryUrl } from "./mac_firefox.js"
import { detectCertutil, getCertutilBinPath } from "./mac_utils.js"

export const getTrustInfoAboutFirefox = async ({
  rootCertificate,
  rootCertificateCommonName,
} = {}) => {
  const firefoxDetected = detectFirefox()
  if (!firefoxDetected) {
    return {
      status: "other",
      reason: "firefox not detected",
    }
  }

  const certutilAvailable = await detectCertutil()
  if (!certutilAvailable) {
    return {
      status: "unknown",
      reason: "missing certutil",
    }
  }

  const { NSSDBFilesWithRootcertificate, NSSDBFilesWithoutRootCertificate } =
    await searchRootCertificateInNSSDBFiles({
      NSSDBDirectoryUrl: firefoxNSSDBDirectoryUrl,
      rootCertificateCommonName,
      rootCertificate,
      getCertutilBinPath,
    })

  const foundCount = NSSDBFilesWithRootcertificate.length
  const missingCount = NSSDBFilesWithoutRootCertificate.length
  const totalCount = foundCount + missingCount

  if (totalCount === 0) {
    return {
      status: "unknown",
      reason: "zero firefox nss database file found",
    }
  }

  if (missingCount > 0) {
    return {
      status: "not_trusted",
      reason: `missing in firefox nss database files (${foundCount}/${totalCount})`,
    }
  }

  return {
    status: "trusted",
    reason: `found in all firefox nss database files (${foundCount}/${totalCount})`,
  }
}

// getTrustInfoAboutFirefox({
//   rootCertificateCommonName: "Jsenv localhost root certificate2",
// })
