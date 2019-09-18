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
const { URL } = require('url');
const { hostname } = require('os');
const path = require('path');
const phin = require('phin');
const { iter } = require('ferrum');
const { numericLogLevel, messageFormatJson } = require('./log');

/* istanbul ignore next */
const _makeUrl = (url, opts) => {
  const o = new URL(url);
  for (const [k, v] of iter(opts)) {
    o.searchParams.set(k, v);
  }
  return String(o);
};

/**
 * Sends log messages to the logdna logging service.
 *
 * Log messages are sent immediately, but due to the use of HTTP
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
 * @param {String} apikey – Your logdna api key
 * @param {String} app – Name of the app under which the log messages should be categorized
 * @param {String} file – Name of the file(/subsystem) under which the
 *    log messages should be categorized
 * @param {Object} opts – Configuration object
 *
 *   - `level`: Default `silly`; The minimum log level to sent to logdna
 *   - `formatter`: Default `messageFormatJson`; A formatter producing json
 *   - `host`: Default is the system hostname; The hostname under which to categorize the messages
 *   - `apiurl`: Default `https://logs.logdna.com`; The url under which the logdna api is hosted.
 *
 *   All other options are forwarded to the formatter.
 */
class LogdnaLogger {
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
   * The hostname under which to categorize the messages
   * @member {String} host
   */

  /**
   * The url under which the logdna api is hosted.
   * @member {String} apiurl
   */

  /* istanbul ignore next */
  constructor(apikey, app, file, opts = {}) {
    const {
      /* istanbul ignore next */
      level = 'silly',
      /* istanbul ignore next */
      formatter = messageFormatJson,
      /* istanbul ignore next */
      host = hostname(),
      /* istanbul ignore next */
      apiurl = 'https://logs.logdna.com/',
      ...fmtOpts
    } = opts;
    assign(this, {
      apikey, apiurl, app, file, host, level, formatter, fmtOpts,
    });
  }

  /* istanbul ignore next */
  log(msg, opts = {}) {
    /* istanbul ignore next */
    const { level = 'info' } = opts || {};
    if (numericLogLevel(level) > numericLogLevel(this.level)) {
      return;
    }

    const now = new Date().getTime();
    phin({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      url: _makeUrl(path.join(this.apiurl, 'logs/ingest'), {
        hostname: this.host,
        apikey: this.apikey,
        now,
      }),
      data: {
        lines: [{
          line: JSON.stringify(this.formatter(msg, { ...this.fmtOpts, level })),
          app: this.app,
          file: this.file,
          timestamp: now,
          level,
        }],
      },
    });
  }
}

module.exports = { LogdnaLogger };
