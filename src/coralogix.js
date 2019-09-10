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
const { hostname } = require('os');
const path = require('path');
const phin = require('phin');
const { numericLogLevel, messageFormatJson } = require('./log');

const _logLevelMapping = {
  fatal: 6,
  error: 5,
  warn: 4,
  info: 3,
  verbose: 2,
  debug: 1,
  trace: 1,
  silly: 1,
};

/**
 * Sends log messages to the coralogix logging service.
 *
 * Internally a sophisticated queueing is used to make sure we send the
 * log messages efficiently in bulk.
 *
 * This logger does not guarantee that all log messages are sent on exit() or abort().
 *
 * ## Future Direction
 *
 * For this sort of necessarily asynchronous logger, we could launch a second process
 * that acts as a proxy and won't crash even if the main node process encounters a fatal
 * exception or even a segfault.
 * We would have to sent the log messages via fifo/pipe or another IPC mechanism synchronously
 * to the logging process, which wouldn't be a problem if we jut make sure that process is
 * quick enough.
 * We could even use a journaling file/directory for communication so the other process could
 * even recover from a system crash...
 *
 * @class
 * @implements Logger
 * @param {String} apikey – Your coralogix api keyy
 * @param {String} app – Name of the app under which the log messages should be categorized
 * @param {String} subsystem – Name of the subsystem under which
 *   the log messages should be categorized
 * @param {Object} opts – Configuration object
 *
 *   - `level`: Default `silly`; The minimum log level to sent to coralogix
 *   - `formatter`: Default `messageFormatJson`; A formatter producing json
 *   - `host`: Default is the system hostname; The hostname under which to categorize the messages
 *   - `apiurl`: Default `https://api.coralogix.com/api/v1/`; where the coralogix api can be found; for testing; where the coralogix api can be found; for testing
 *
 *   All other options are forwarded to the formatter.
 */
class CoralogixLogger {
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

  /**
   * Name of the app under which the log messages should be categorized
   * @member {String} apikey
   */

  /**
   * Name of the app under which the log messages should be categorized
   * @member {String} app
   */

  /**
   * Name of the subsystem under which the log messages should be categorized
   * @member {String} subsystem
   */

  /**
   * The hostname under which to categorize the messages
   * @member {String} host
   */

  /* istanbul ignore next */
  constructor(apikey, app, subsystem, opts = {}) {
    const {
      /* istanbul ignore next */
      level = 'silly',
      /* istanbul ignore next */
      formatter = messageFormatJson,
      /* istanbul ignore next */
      host = hostname(),
      /* istanbul ignore next */
      apiurl = 'https://api.coralogix.com/api/v1/',
      ...fmtOpts
    } = opts;
    assign(this, {
      apikey, apiurl, app, subsystem, host, level, formatter, fmtOpts,
    });
  }

  /* istanbul ignore next */
  log(msg, opts = {}) {
    /* istanbul ignore next */
    const { level = 'info' } = opts || {};
    if (numericLogLevel(level) > numericLogLevel(this.level)) {
      return;
    }

    phin({
      url: path.join(this.apiurl, '/logs'),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        privateKey: this.apikey,
        applicationName: this.app,
        subsystemName: this.subsystem,
        computerName: this.host,
        logEntries: [{
          timestamp: new Date().getTime(),
          text: JSON.stringify(this.formatter(msg, { ...this.fmtOpts, level })),
          severity: _logLevelMapping[level],
        }],
      },
    });
  }
}

module.exports = { CoralogixLogger };
