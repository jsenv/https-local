import { createRequire } from "node:module"

const require = createRequire(import.meta.url)

// eslint-disable-next-line import/no-unresolved
const { sync: glob } = require("glob")

console.log(glob("./dir/*"))
