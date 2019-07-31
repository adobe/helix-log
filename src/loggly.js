/*
 * Copyright 2019 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

const { assign } = Object;
const phin = require('phin');
const { last, empty, size, take, type, TraitNotImplemented, isdef, list } = require('ferrum');
const { numericLogLevel, error, serializeMessage, messageFormatJson } = require('./log');

/**
 * Pretty much the json logger.
 *
 * The only difference is that the timestamp is an integer containing the
 * number of milliseconds since 1970-01-01.
 *
 * @param {any[]} msg – Parameters as you would pass them to console.log
 * @param {Object} opts – Parameters are forwarded to serializeMessage; other than that:
 *
 *   - level: one of the log levels; this parameter is required.
 */
const messageFormatLoggly = (...args) => ({
  ...messageFormatJson(...args),
  timestamp: new Date().getTime(),
});

/**
 * Sends log messages to the loggly message logging service.
 *
 * @class
 * @implements Logger
 * @param {String} logglyToken - The token to use when authenticating with loggly.
 * @param {Object} opts – Configuration object
 *
 *   - `level`: Default `info`; The minimum log level to sent to loggly
 *   - `formatter`: Default `messageFormatLoggly`; A formatter producing json
 *
 *   All other options are forwarded to the formatter.
 */
class LogglyLogger {
  /**
   * The token to use when authenticating with loggly.
   * @Member {String} logglyToken
   */

  /**
   * The minimum log level for messages to be printed.
   * Feel free to change to one of the available levels.
   * @member {string} level
   */

  /**
   * Formatter used to format all the messages.
   * Must yield an object suitable for passing to JSON.serialize
   * @member {Function} formatter
   */

  /**
   * Options that will be passed to the formatter;
   * Feel free to mutate or exchange.
   * @member {object} fmtOpts
   */

  constructor(logglyToken, opts = {}) {
    const { level = 'info', formatter = messageFormatLoggly, ...fmtOpts } = opts;
    assign(this, {logglyToken, level, formatter, fmtOpts});
  }

  log(msg, opts = {}) {
    const { level = 'info' } = opts || {};
    if (numericLogLevel(level) > numericLogLevel(this.level)) {
      return undefined;
    }

    return phin({
      url: `http://logs-01.loggly.com/inputs/${this.logglyToken}/tag/http/`,
      method: 'POST',
      data: this.formatter(msg, {...this.fmtOpts, level}),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};

module.exports = { LogglyLogger };
