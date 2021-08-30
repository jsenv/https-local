import {
  readHostsFile,
  parseHosts,
  writeHostsFile,
} from "@jsenv/local-https-certificates/src/internal/hosts.js"

const hostsFileContent = await readHostsFile()
const hostnames = parseHosts(hostsFileContent)
const localIpHostnames = hostnames.getIpHostnames("127.0.0.1")
if (!localIpHostnames.includes("localhost")) {
  hostnames.addIpHostname("127.0.0.1", "localhost")
}
if (!localIpHostnames.includes("local.example.com")) {
  hostnames.addIpHostname("127.0.0.1", "local.example.com")
}
await writeHostsFile(hostnames.asFileContent())
