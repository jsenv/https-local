# Production mode

The goal of the production mode is to have a second way to execute your code. With it you have 2 ways of executing your code:

1. _default mode_
2. _production mode_

In _default mode_ you can do things specific to development and in _production mode_ do things specific to production.

Example of code specific to development:

```js
import { DEV } from "#env"

if (DEV) {
  console.log("This log is displayed only during dev")
}
```

Example of code acting differently depending on the mode:

```js
import { DATABASE_URL } from "#env"

console.log(`The database url is ${DATABASE_URL}`)
```

Disclaimer: In most case you don't need a production mode, so it's recommended to remove it.

This repository has preconfigured a _production mode_, if you want to keep this ability, check [How to use production mode](#how-to-use-production-mode). Otherwise see [How to remove production mode](#how-to-remove-production-mode).

# How to use production mode

Let's take an example with the `index.js` file below.

```js
import { DEV } from "#env"

console.log(DEV ? "development" : "production")
```

See below the two scenarios and their result:

```console
> node index.js
development
```

```console
> node --conditions=production index.js
production
```

What happens is that `node` remaps `#env` either to [env.dev.js](../../env.dev.js) or [env.prod.js](../../env.prod.js). This is configured by `"imports"` field in our [package.json](../../package.json#L34).

This feature is called _package conditions_ on [Node.js documentation](https://nodejs.org/docs/latest-v15.x/api/packages.html#packages_resolving_user_conditions).

# How to remove production mode

1. Remove all `#env` imports in files
2. Remove `/env.dev.js` and `/env.prod.js` from `"files"` in [package.json](../../package.json#L40)
3. Delete [env.prod.js](../../env.prod.js)
4. Delete [env.dev.js](../../env.dev.js)
5. Remove `"node-prod"` from `testPlan` in [script/test/test.mjs](../../script/test/test.mjs#L18)
6. Remove `"#env"` from `"imports"` in [package.json](../../package.json#L34)
7. Remove the launch configuration named `"node (prod)"` in [.vscode/launch.json](../../.vscode/launch.json#L26)
