/*
 * This file is some boilerplate code meant to be replaced by real code
 * - It shows how you can write code specific to dev/production
 */

import { DEV } from "#env"

const message = DEV ? "Hello dev!" : "Hello prod!"

export const getMessage = () => {
  return message
}

export const getMessageAsync = async () => {
  return message
}
