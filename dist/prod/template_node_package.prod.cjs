'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

/*
 * This file is some boilerplate code meant to be replaced by real code
 * - It shows how you can write code specific to dev/production
 */
const message = "Hello prod!";
const getMessage = () => {
  return message;
};
const getMessageAsync = async () => {
  return message;
};

exports.getMessage = getMessage;
exports.getMessageAsync = getMessageAsync;

//# sourceMappingURL=template_node_package.prod.cjs.map