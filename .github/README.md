<!--
README about the GitHub repository template.
Once the template is used, this README should be
deleted and only ../README.md should be kept
-->

# Node ESM package template

This repository is meant to serve as a general template for how to set up GitHub repositories publishing a node package on npm.

The npm package is visible at https://www.npmjs.com/package/@jsenv/template-node-package.

# How to use

Create a GitHub repository using this template at https://github.com/jsenv/jsenv-template-node-package/generate.
Then follow checklist below to setup your repository.

- [ ] Update fields in [package.json](../package.json), especially `"name"`, `"description"`, `"version"` and `"author"`
- [ ] Update [README.md](../README.md) and delete `.github/README.md`
- [ ] Review [LICENSE](../LICENSE) and `"license"` in [package.json](../package.json#L6)
- [ ] Remove `"private": true` in [package.json](../package.json#L4)

# Features

Documentation of the features, how to use and or remove them.

- [Formatting](../docs/formatting/formatting.md#formatting): Formatting with prettier
- [Linting](../docs/linting/linting.md#linting): Linting with ESLint
- [import resolution](../docs/import_resolution/import_resolution.md#import-resolution): Node.js ESM resolution algorithm for ESLint and VSCode
- [Production mode](../docs/production_mode/production_mode.md#production-mode): Ability to write code specific to production or development
- [Testing](../docs/testing/testing.md#testing): Running tests with jsenv
- [Code coverage](../docs/coverage/coverage.md#coverage): Code coverage with codecov
- [CommonJS compatibility](../docs/commonjs_compat/commonjs_compat.md#commonjs-compatibility): Keeping your package compatible with commonJS
- [Publishing](../docs/publishing/publishing.md#publishing): Automated process to publish on NPM
- [Pull request impacts](../docs/pr_impacts/pr_impacts.md#pull-request-impacts): Automated process commenting pull requests impacts on custom metrics

# Things to know

- Node.js Long Term Support version should be used while coding and to use the package published on npm. At the time of writing this documentation it means version 14.17.0.

- Default branch of the repository is named _main_. It can be renamed in repository settings on GitHub.

- There is 2 type of js files: Files meant to be published on npm and the others. To help recognize which are which, files published on npm have _.js_ extension while the others have the _.mjs_ extension. This pattern is subjective and you are free to change it.
