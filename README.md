> The documentation below is part of the [GitHub repository template](https://docs.github.com/en/github-ae@latest/github/creating-cloning-and-archiving-repositories/creating-a-repository-from-a-template#creating-a-repository-from-a-template). Check [.github/README.md](./.github/README.md) to read documentation about the template itself.

# Node package title

Node package description.

[![npm package](https://img.shields.io/npm/v/@jsenv/template-node-package.svg?logo=npm&label=package)](https://www.npmjs.com/package/@jsenv/template-node-package)
[![github main](https://github.com/jsenv/jsenv-template-node-package/workflows/main/badge.svg)](https://github.com/jsenv/jsenv-template-node-package/actions?workflow=main)
[![codecov coverage](https://codecov.io/gh/jsenv/jsenv-template-node-package/branch/main/graph/badge.svg)](https://codecov.io/gh/jsenv/jsenv-template-node-package)

# Presentation

This package is a demo for https://github.com/jsenv/jsenv-template-node-package. It is not meant to provide anything useful.

# Installation

```console
npm install @jsenv/template-node-package
```

## 1. Create <code>example.js</code>

```js
import { getMessage } from "@jsenv/template-node-package"

console.log(getMessage())
```

## 2. Execute with node

```console
> node ./example.js
Hello dev!
```

# getMessage

_getMessage_ is a function returning a string.

```js
import { getMessage } from "@jsenv/template-node-package"

const message = getMessage()
message // "Hello dev!"
```

The returned string is different in [production mode](#production-mode)

# getMessageAsync

_getMessageAsync_ is like [getMessage](#getMessage) except it's an async function.

```js
import { getMessageAsync } from "@jsenv/template-node-package"

const message = await getMessageAsync()
message // "Hello dev!"
```

# Production mode

The code of this npm package behaves differently when executed with `--conditions=production`.

_file.js_

```js
import { getMessage } from "@jsenv/template-node-package"

console.log(getMessage())
```

```console
> node ./file.js
Hello dev!
```

```console
> node --conditions=production ./file.js
Hello prod!
```

# CommonJS compatibility

The package can also be used with _require_.

```js
const { getMessage } = require("@jsenv/template-node-package")

console.log(getMessage())
```

# Development

If you are part or want to be part of the developpers of this package, check [development.md](./docs/development.md)
