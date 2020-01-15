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
const { dict, each } = require('ferrum');
const { __handleLoggingExceptions } = require('./utils.js');
const __globalLogCounter = require('./globalLogCounter.js');

const LoggerBase = require('./LoggerBase.js');

/**
 * Simple logger that forwards all messages to the underlying loggers.
 *
 * This maintains an es6 map called loggers. Consumers of this API are
 * explicitly permitted to mutate this map or replace it all together in
 * order to add, remove or alter logger.
 *
 * @example
 * ```js
 * const { rootLogger } = require('@adobe/helix-shared').log;
 *
 * // Changing the log level of the default logger:
 * rootLogger.loggers.get('default').level = 'info';
 *
 * // Adding a named logger
 * rootLogger.loggers.set('logfile', new FileLogger('...'));
 *
 * // Adding an anonymous logger (you can add an arbitrary number of these)
 * const name = `logfile-${uuidgen()}`;
 * rootLogger.loggers.set(name, new FileLogger('...'));
 *
 * // Deleting a logger
 * rootLogger.loggers.delete(name);
 *
 * // Replacing all loggers
 * rootLogger.loggers = new Map([['default', new ConsoleLogger({level: 'debug'})]]);
 * ```
 *
 * @implements Logger
 * @class
 * @parameter {Sequence<Loggers>} loggers – The loggers to forward to.
 */
class MultiLogger extends LoggerBase {
  /*
   * The list of loggers this is forwarding to. Feel free to mutate
   * or replace.
   *
   * @memberOf MultiLogger#
   * @member {Map<Logger>} loggers
   */

  constructor(loggers, opts = {}) {
    super(opts);
    this.loggers = dict(loggers);
  }

  _logImpl(fields) {
    each(this.loggers, ([_name, sub]) => {
      __handleLoggingExceptions(fields, sub, async () => {
        await sub.log(fields);
        if (this.isRootLogger) {
          __globalLogCounter.fwdCount += 1;
        }
      });
    });
  }
}

module.exports = MultiLogger;
