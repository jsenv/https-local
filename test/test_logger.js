/*
 * Logs are an important part of this package
 * For this reason tests msut be capable to ensure which logs are displayed
 * and their content. This file provide a logger capable to do that.
 */

export const createLoggerForTest = () => {
  const debugs = []
  const infos = []
  const warns = []
  const errors = []

  return {
    debug: (...args) => {
      debugs.push(args.join(""))
    },
    info: (...args) => {
      infos.push(args.join(""))
    },
    warn: (...args) => {
      warns.push(args.join(""))
    },
    error: (...args) => {
      errors.push(args.join(""))
    },

    getLogs: (
      { debug, info, warn, error } = {
        debug: true,
        info: true,
        warn: true,
        error: true,
      },
    ) => {
      return {
        ...(debug ? { debugs } : {}),
        ...(info ? { infos } : {}),
        ...(warn ? { warns } : {}),
        ...(error ? { errors } : {}),
      }
    },
  }
}
