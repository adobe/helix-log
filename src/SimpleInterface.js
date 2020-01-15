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
const {
  intersperse, list, type, typename,
} = require('ferrum');

const InterfaceBase = require('./InterfaceBase.js');

/**
 * The fields interface provides the ability to conveniently
 * specify both a message and custom fields to the underlying logger.
 *
 * @example
 * ```
 * const { SimpleInterface } = require('helix-log');
 *
 * class log = new SimpleInterface();
 * log.infoFields("Wubalubadubdub", {
 *   drunk: true
 * });
 * log.errorFields("Nooez", { error: "Evil Morty!" });
 * log.error("Nooez without custom fields");
 * ```
 *
 * @class
 * @implements LoggingInterface
 */
class SimpleInterface extends /* private */ InterfaceBase {
  _logImpl(level, ...msg) {
    const fields = msg.pop();
    /* istanbul ignore next */
    if (type(fields) !== Object) {
      throw new Error('Data given as the last argument the helix-log '
        + `SimpleInterface must be a plain Object, not a ${typename(type(fields))}.`);
    }

    const message = list(intersperse(msg, ' '));
    super._logImpl({ message, level, ...fields });
  }

  /**
   * The *Fields methods are used to log both a message
   * custom fields to the underlying logger.
   *
   * The fields object must be present (and error will be thrown
   * if the last element is not an object) and any fields specified
   * take precedence over default values.
   *
   * @example
   * ```
   * const { SimpleInterface } = require('helix-log');
   *
   * const logger = new SimpleInterface();
   *
   * // Will throw an error because the fields object is missing.
   * logger.verboseFields("Hello");
   *
   * // Will log a message 'Fooled!' with level error and the time
   * // stamp set to the y2k (although it would be more customary
   * // use logFields to indicate that the log level will be set through
   * // the fields).
   * sillyFields("Hello World", {
   *   level: 'error',
   *   timestamp: new Date("2000-01-01"),
   *   message: ["Fooled!"]
   * });
   * ```
   *
   * @memberOf SimpleInterface#
   * @method
   * @alias sillyFields
   * @alias traceFields
   * @alias debugFields
   * @alias verboseFields
   * @alias infoFields
   * @alias warnFields
   * @alias errorFields
   * @alias fatalFields
   * @param {...*} msg The message to write
   */
  logFields(...msg) { this._logImpl('info', ...msg); }

  sillyFields(...msg) { this._logImpl('silly', ...msg); }

  traceFields(...msg) { this._logImpl('trace', ...msg); }

  /* istanbul ignore next */
  debugFields(...msg) { this._logImpl('debug', ...msg); }

  verboseFields(...msg) { this._logImpl('verbose', ...msg); }

  infoFields(...msg) { this._logImpl('info', ...msg); }

  /* istanbul ignore next */
  warnFields(...msg) { this._logImpl('warn', ...msg); }

  /* istanbul ignore next */
  errorFields(...msg) { this._logImpl('error', ...msg); }

  fatalFields(...msg) { this._logImpl('fatal', ...msg); }

  /**
   * These methods are used to log just a message with no custom
   * fields to the underlying logger; similar to console.log.
   *
   * This is not a drop in replacement for console.log, since this
   * does not support string interpolation using `%O/%f/...`, but should
   * cover most use cases.
   *
   * @memberOf SimpleInterface#
   * @method
   * @alias silly
   * @alias trace
   * @alias debug
   * @alias verbose
   * @alias info
   * @alias warn
   * @alias error
   * @alias fatal
   * @param {...*} msg The message to write
   */
  log(...msg) { this._logImpl('info', ...msg, {}); }

  /* istanbul ignore next */
  silly(...msg) { this._logImpl('silly', ...msg, {}); }

  /* istanbul ignore next */
  trace(...msg) { this._logImpl('trace', ...msg, {}); }

  debug(...msg) { this._logImpl('debug', ...msg, {}); }

  verbose(...msg) { this._logImpl('verbose', ...msg, {}); }

  info(...msg) { this._logImpl('info', ...msg, {}); }

  warn(...msg) { this._logImpl('warn', ...msg, {}); }

  error(...msg) { this._logImpl('error', ...msg, {}); }

  /* istanbul ignore next */
  fatal(...msg) { this._logImpl('fatal', ...msg, {}); }
}

module.exports = SimpleInterface;
