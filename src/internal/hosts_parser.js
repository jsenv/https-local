// https://github.com/feross/hostile/blob/master/index.js

const IS_WINDOWS = process.platform === "win32"

export const parseHosts = (hosts, { EOL = IS_WINDOWS ? "\r\n" : "\n" } = {}) => {
  const lines = []
  hosts.split(/\r?\n/).forEach((line) => {
    const lineWithoutComments = line.replace(/#.*/, "")
    const matches = /^\s*?(.+?)\s+(.+?)\s*$/.exec(lineWithoutComments)
    if (matches && matches.length === 3) {
      const [, ip, host] = matches
      lines.push({ type: "rule", ip, host })
    } else {
      // Found a comment, blank line, or something else
      lines.push({ type: "other", value: line })
    }
  })

  const hasRule = ({ ip, host }) => {
    return lines.some((line) => {
      return line.type === "rule" && line.ip === ip && line.host === host
    })
  }

  const addRule = ({ ip, host }) => {
    const existingIpRule = lines.find((line) => line.ip === ip)
    if (existingIpRule) {
      existingIpRule.host = host
      return
    }

    const rule = { type: "rule", ip, host }
    const lastLineIndex = lines.length - 1
    const lastLine = lines[lastLineIndex]
    // last line is just empty characters, put the rule above it
    if (lastLine.type === "other" && /\s*/.test(lastLine.value)) {
      lines.splice(lastLineIndex, 0, rule)
      return
    }
    lines.push(rule)
  }

  const removeRule = ({ ip, host }) => {
    const ruleIndex = lines.findIndex((line) => {
      return line.type === "rule" && line.ip === ip && line.host === host
    })
    if (ruleIndex === -1) {
      return false
    }
    lines.splice(ruleIndex, 1)
    return true
  }

  const stringify = () => {
    let hostsFileContent = ""
    const ips = lines.filter((line) => line.type === "rule").map((line) => line.ip)
    const longestIp = ips.reduce((previous, ip) => {
      const length = ip.length
      return length > previous ? length : previous
    }, 0)

    lines.forEach((line, index) => {
      if (line.type === "rule") {
        const { ip, host } = line
        const ipLength = ip.length
        const lengthDelta = longestIp - ipLength
        hostsFileContent += `${ip}${" ".repeat(lengthDelta)} ${host}`
      } else {
        hostsFileContent += line.value
      }

      if (index !== lines.length - 1) {
        hostsFileContent += EOL
      }
    })
    return hostsFileContent
  }

  const getRules = () => {
    const rules = {}
    lines.forEach((line) => {
      if (line.type === "rule") {
        const { ip, host } = line
        const existingIp = rules[host]
        if (typeof existingIp === "undefined") {
          rules[host] = ip
        } else if (typeof existingIp === "string") {
          rules[host] = [existingIp, ip]
        } else if (Array.isArray(existingIp)) {
          rules[host] = [...existingIp, ip]
        }
      }
    })
    return rules
  }

  return {
    getRules,
    hasRule,
    addRule,
    removeRule,
    stringify,
  }
}
