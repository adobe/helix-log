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
const { assign } = Object;
const {
  dict, each, type, identity, typename, empty,
} = require('ferrum');
const { openSync, closeSync, writeSync } = require('fs');

const { __handleLoggingExceptions, numericLogLevel, tryInspect } = require('./utils.js');
const { messageFormatConsole, messageFormatTechnical } = require('./messageFormats.js');
const __globalLogCounter = require('./globalLogCounter.js');




/**
 * Can be used as a base class/helper for implementing loggers.
 *
 * This will first apply the filter, drop the message if the level is
 * too low or if the filter returned undefined and will then call the
 * subclass provided this._logImpl function for final processing.
 *
 * This also wraps the entire logging logic into a promise enabled/async
 * error handler that will log any errors using the rootLogger.
 *
 * @example
 * ```
 * class MyConsoleLogger extends LoggerBase {
 *   _logImpl(fields) {
 *     console.log(fields);
 *   }
 * }
 * ```
 *
 * @class
 * @param {Object} opts – Optional, named parameters
 * @param {string} [opts.level='silly'] The minimum log level to sent to loggly
 * @param {Function} [opts.filter=identity] Will be given every log message to perform
 *   arbitrary transformations; must return either another valid message object or undefined
 *   (in which case the message will be dropped).
 */
class LoggerBase {
  /**
   * The minimum log level for messages to be printed.
   * Feel free to change to one of the available levels.
   * @memberOf LoggerBase#
   * @member {string} level
   */

  /**
   * Used to optionally transform all messages.
   * Takes a message and returns a transformed message
   * or undefined (in which case the message will be dropped).
   * @memberOf LoggerBase#
   * @member {Function} filter
   */

  constructor({
                level = 'silly', defaultFields = {}, filter = identity, ...unknown
              } = {}) {
    assign(this, { level, filter, defaultFields });
    if (!empty(unknown)) {
      throw new Error(`Unknown named options given to ${typename(type(this))}: ${tryInspect(unknown)}`);
    }
  }

  // Private: Code sharing with FormattedLoggerBase
  __logWithFormatter(fields_, formatter) {
    __handleLoggingExceptions(fields_, this, async () => {
      const fields = this.filter(fields_);
      if (fields !== undefined && numericLogLevel(fields.level) <= numericLogLevel(this.level)) {
        const mergedFields = { ...this.defaultFields, ...fields };
        if (formatter === undefined) { // LoggerBase impl
          return this._logImpl(mergedFields);
        } else { // FormattedLoggerBase impl
          return this._logImpl(this.formatter(mergedFields), fields);
        }
      }
    });
  }

  log(fields) {
    return this.__logWithFormatter(fields, undefined);
  }
}

module.exports = LoggerBase;
