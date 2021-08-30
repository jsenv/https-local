import { verifyHostsFile } from "@jsenv/local-https-certificates"

await verifyHostsFile({
  ipMappings: {
    "127.0.0.1": ["localhost", "local.example.com"],
  },
  tryToUpdateHostsFile: true,
})
