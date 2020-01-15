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
const { identity } = require('ferrum');
const LoggerBase = require('./LoggerBase.js');

/**
 * Can be used as a base class/helper for implementing loggers that
 * require a formatter.
 *
 * Will do the same processing as `LoggerBase` and in addition call
 * the formatter before invoking _logImpl.
 *
 * @example
 * ```
 * class MyConsoleLogger extends FormattedLoggerBase {
 *   _logImpl(payload, fields) {
 *     console.log(`[${fields.level}]`, payload);
 *   }
 * }
 * ```
 *
 * @class
 * @param {Function} [opts.formatter] In addition to the filter, the formatter
 *   will be used to convert the message into a format compatible with
 *   the external resource.
 */
class FormattedLoggerBase extends LoggerBase {
  /**
   * Formatter used to format all the messages.
   * Must yield an object suitable for the external resource
   * this logger writes to.
   * @memberOf FormattedLoggerBase#
   * @member {MessageFormatter} formatter
   */

  constructor({ formatter = identity, ...opts } = {}) {
    super(opts);
    assign(this, { formatter });
  }

  log(fields) {
    this.__logWithFormatter(fields, this.formatter);
  }
}

module.exports = FormattedLoggerBase;
