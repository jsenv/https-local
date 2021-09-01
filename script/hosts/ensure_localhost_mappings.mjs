import { verifyHostsFile } from "@jsenv/local-https-certificates"

await verifyHostsFile({
  logLevel: "debug",
  ipMappings: {
    "127.0.0.1": ["localhost", "local.example"],
  },
  tryToUpdateHostsFile: true,
})
