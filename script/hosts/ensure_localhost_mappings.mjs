import { verifyHostsFile } from "@jsenv/https-localhost"

await verifyHostsFile({
  ipMappings: {
    "127.0.0.1": ["localhost", "local.example.com"],
  },
  tryToUpdateHostsFile: true,
})
