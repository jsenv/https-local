import { assert } from "@jsenv/assert"
import { readFile } from "@jsenv/filesystem"

import { parseHosts } from "@jsenv/https-localhost/src/internal/hosts_parser.js"

const hostsAContent = await readFile(new URL("./hosts_a", import.meta.url))
const hostsA = parseHosts(hostsAContent)

// rules parsing
{
  const actual = hostsA.getAllIpHostnames()
  const expected = {
    "127.0.0.1": ["localhost", "tool.example.com", "jsenv"],
    "255.255.255.255": ["broadcasthost"],
    "::1": ["localhost"],
  }
  assert({ actual, expected })
}

// without touching anything output is the same
{
  const actual = hostsA.stringify()
  const expected = hostsAContent
  assert({ actual, expected })
}

{
  const actual = hostsA.getIpHostnames("127.0.0.1")
  const expected = ["localhost", "tool.example.com", "jsenv"]
  assert({ actual, expected })
}
