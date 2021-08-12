import { createRequire } from "node:module"

const require = createRequire(import.meta.url)

const devcert = require("devcert")

const result = await devcert.certificateFor(["localhost"], { getCaPath: true })

console.log(result)
