export const importPlatformMethods = async () => {
  const { platform } = process
  if (platform === "darwin") {
    return await import("./platforms/mac.js")
  }
  if (platform === "linux") {
    return await import("./platforms/linux.js")
  }
  if (platform === "win32") {
    return await import("./platforms/windows.js")
  }
  return await import("./platforms/unsupported.js")
}
