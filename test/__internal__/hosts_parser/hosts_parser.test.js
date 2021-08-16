import { assert } from "@jsenv/assert"
import { readFile } from "@jsenv/filesystem"

import { parseHosts } from "@jsenv/https-localhost/src/internal/hosts_parser.js"

const hostsAContent = await readFile(new URL("./hosts_a", import.meta.url))
const hostsA = parseHosts(hostsAContent)

// rules parsing
{
  const actual = hostsA.getRules()
  const expected = {
    "localhost": ["127.0.0.1", "::1"],
    "broadcasthost": "255.255.255.255",
    "tool.example.com": "127.0.0.1",
    "jsenv": "127.0.0.1",
  }
  assert({ actual, expected })
}

// without touching anything output is the same
{
  const actual = hostsA.stringify()
  const expected = hostsAContent
  assert({ actual, expected })
}
