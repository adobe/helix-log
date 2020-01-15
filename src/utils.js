/*
 * Copyright 2020 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
const { inspect } = require('util');
const {
  exec, isdef, join, type, typename, eq, pipe, map,
} = require('ferrum');
const { BigDate } = require('./big-date');
const { error, warn } = require('./globalLogger.js');

/**
 * Wrapper around inspect that is extremely robust against errors
 * during inspection.
 *
 * Specifically designed to handle errors in toString() functions
 * and custom inspect functions.
 *
 * If any error is encountered a less informative string than a full
 * inspect is returned and the error is logged using `err()`.
 *
 * @function
 * @param {*} what The object to inspect
 * @param {Object} opts Options will be passed through to inspect.
 *   Note that these may be ignored if there is an error during inspect().
 */
const tryInspect = (what, opts = {}) => {
  const opts_ = { depth: null, breakLength: Infinity, ...opts };
  const errors = [];
  let msg;

  // This will fail if [inspect.custom]() is borked for some type in the tree
  try {
    msg = inspect(what, opts_);
  } catch (e) {
    errors.push(e);
  }

  // This will still fail if the class name of some type in the tree is borked
  try {
    // Maybe error was because of custom inspect?
    msg = isdef(msg) ? msg : inspect(what, { ...opts_, customInspect: false });
  } catch (e) {
    errors.push(e);
  }

  // Log that we encountered errors during inspecting after we printed
  // this
  exec(async () => {
    if (!opts_.recursiveErrorHandling && errors.length > 0) {
      await new Promise((res) => setImmediate(res));
      for (const e of errors) {
        const ser = tryInspect(e, { ...opts_, recursiveErrorHandling: true });
        error(`Error while inspecting object for log message: ${ser}`);
      }
    }
  });

  return isdef(msg) ? msg : '<<COULD NOT INSPECT>>';
};

/**
 * Internally helix log passe these messages around.
 *
 * Messages are just plain objects with some conventions
 * regarding their fields:
 *
 * @example
 * ```
 * const myMessage = {
 *   // REQUIRED
 *
 *   level: 'info',
 *   timestamp: new BigDate(), // Can also be a normal Date
 *
 *   // OPTIONAL
 *
 *   // This is what constitutes the actual log message an array
 *   // of any js objects which are usually later converted to text
 *   // using `tryInspect()`; we defer this text conversion step so
 *   // formatters can do more fancy operations (like colorizing certain
 *   // types; or we could)
 *   message: ['Print ', 42, ' deep thoughts!']
 *   exception: {
 *
 *     // REQUIRED
 *     $type: 'MyCustomException',
 *     name; 'MyCustomException',
 *     message: 'Some custom exception ocurred',
 *     stack: '...',
 *
 *     // OPTIONAL
 *     code: 42,
 *     causedBy: <nested exception>
 *
 *     // EXCEPTION MAY CONTAIN ARBITRARY OTHER FIELDS
 *     ...fields,
 *   }
 *
 *   // MESSAGE MAY CONTAIN ARBITRARY OTHER FIELDS
 *   ...fields,
 * }
 * ```
 *
 * @interface Message
 */

/**
 * Supplies default values for all the required fields in log messages.
 *
 * You may pass this a message that is just a string (as opposed to the
 * usually required array of message components). The message will then automatically
 * be wrapped in an array.
 *
 * @function
 * @param {Object} [fields={}] User supplied field values; can overwrite
 *   any default values
 * @returns {Message}
 */
const makeLogMessage = (fields = {}) => {
  const r = {
    level: 'info',
    timestamp: new BigDate(),
    ...fields,
  };
  if ('message' in r) {
    r.message = type(r.message) === Array ? r.message : [r.message];
  }
  return r;
};

/**
 * Turns the message field into a string.
 *
 * @function
 * @param {Array<*>|undefined} msg – Message components to serialize
 * @param {Object} opts – Parameters are forwarded to tryInspect()
 * @returns {string}
 */
const serializeMessage = (msg, opts = {}) => {
  if (msg === undefined) { // No message at all (which is OK!)
    return '';
  } else if (type(msg) === Array) { // Message is an array (as is proper)
    return pipe(
      msg,
      map((v) => (type(v) === String ? v : tryInspect(v, opts))),
      join(''),
    );
  } else {
    // These are technically invalid, we still handle them gracefully and
    // emit a warning.

    warn.fields(`serializeMessage takes an array or undefined as message. Not ${typename(type(msg))}!`, {
      invalidMessage: msg,
    });

    return type(msg) === String ? msg : tryInspect(msg, opts);
  }
};

// This is the superset of log levels supported by console, bunyan and winston
const __loglevelMap = {
  fatal: 0,
  error: 1,
  warn: 2,
  info: 3,
  verbose: 4,
  debug: 5,
  trace: 6,
  silly: 7,
};

/**
 * This can be used to convert a string log level into it's
 * numeric equivalent. More pressing log levels have lower numbers.
 *
 * @throws {Error} If the given log level name is invalid.
 * @param {string} name Name of the log level
 * @returns {number} The numeric log level
 */
const numericLogLevel = (name) => {
  const r = __loglevelMap[name];
  /* istanbul ignore next */
  if (r === undefined) {
    throw new Error(`Not a valid log level: ${name}`);
  }
  return r;
};

numericLogLevel.__loglevelMap = __loglevelMap;

/**
 * Helper function that creates a derived logger that is derived from a given logger, merging
 * the given options. All the properties are shallow copied to the new logger With the exception of
 * the `defaultFields`, where the `defaultFields` object itself is shallow-copied. Thus allowing to
 * _extend_ the default fields.
 *
 * @param {Logger} logger the logger to derive from.
 * @param {object} opts Options to merge with this logger
 * @returns {Logger} A new logger with updated options.
 */
const deriveLogger = (logger, opts) => {
  const { defaultFields: optFields = {}, ...rest } = opts;
  const defaultFields = { ...logger.defaultFields, ...optFields };
  return new logger.constructor({ ...logger, defaultFields, ...rest });
};

/**
 * Helper to wrap any block of code and handle it's async & sync exceptions.
 *
 * This will catch any exceptions/promise rejections and log them using the rootLogger.
 *
 * @function
 * @package
 * @param {Object} fields Fields to set in any error message (usually indicates which logger
 *   was used)
 * @param {Logger} logger the logger to wrap
 * @param {Function} code The code to wrap
 * @returns {Message}
 */
const __handleLoggingExceptions = (fields, logger, code) => {
  exec(async () => {
    try {
      await code();
    } catch (e) {
      const errorMsg = 'Encountered exception while logging!';
      // Debounce error messages
      if (!fields.message || !eq(fields.message, [errorMsg])) {
        // Defer logging the error (useful with multi logger so all messages
        // are logged before the errors are logged)
        await new Promise((res) => setImmediate(res));
        error.fields(errorMsg, {
          application: 'infrastructure',
          subsystem: 'helix-log-error-handling',
          exception: e,
          logger,
        });
      }
    }
  });
};

module.exports = {
  __handleLoggingExceptions,
  tryInspect,
  makeLogMessage,
  serializeMessage,
  numericLogLevel,
  deriveLogger,
};
