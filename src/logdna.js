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
const { messageFormatJsonString, FormattedLoggerBase } = require('./log');
const { Secret } = require('./secret');

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
 */

/**
 * Sends log messages to the logdna logging service.
 *
 * Log messages are sent immediately.
 *
 * @class
 * @implements Logger
 * @param {string|Secret} apikey – Your logdna api key
 * @param {string} app – Name of the app under which the log messages should be categorized
 * @param {string} file – Name of the file(/subsystem) under which the
 *    log messages should be categorized
 * @param {Object} opts
 *
 *   - `host`: Default is the system hostname; The hostname under which to categorize the messages
 *   - `apiurl`: Default `https://logs.logdna.com`; The url under which the logdna api is hosted.
 */
class LogdnaLogger extends FormattedLoggerBase {
  /**
   * Name of the app under which the log messages should be categorized
   * @memberOf LogdnaLogger#
   * @member {Secret} apikey
   */

  /**
   * Name of the app under which the log messages should be categorized
   * @memberOf LogdnaLogger#
   * @member {string} app
   */

  /**
   * The hostname under which to categorize the messages
   * @memberOf LogdnaLogger#
   * @member {string} host
   */

  /**
   * The url under which the logdna api is hosted.
   * @memberOf LogdnaLogger#
   * @member {string} apiurl
   */

  /* istanbul ignore next */
  constructor(apikey, app, file, opts = {}) {
    const {
      /* istanbul ignore next */
      host = hostname(),
      /* istanbul ignore next */
      apiurl = 'https://logs.logdna.com/',
      formatter = messageFormatJsonString,
      ...rest
    } = opts;
    super({ formatter, ...rest });
    assign(this, {
      apikey: new Secret(apikey),
      apiurl,
      app,
      file,
      host,
    });
  }

  _logImpl(payload, fields) {
    return phin({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      url: _makeUrl(path.join(this.apiurl, 'logs/ingest'), {
        hostname: this.host,
        apikey: this.apikey.secret,
        now: fields.timestamp.getTime(),
      }),
      data: {
        lines: [{
          line: payload,
          app: this.app,
          file: this.file,
          timestamp: fields.timestamp.getTime(),
          level: fields.level,
        }],
      },
    });
  }
}

module.exports = { LogdnaLogger };
