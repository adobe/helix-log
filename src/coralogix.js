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
const https = require('https');
const { messageFormatJsonString, FormattedLoggerBase } = require('./log');
const { BigDate } = require('./big-date');
const { Secret } = require('./secret');

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
 * The formatter must produce a string; since coralogix recognizes
 * json encoded data in the log string, messageFormatJsonString is
 * used by default.
 *
 * ## Future Direction
 *
 * We may introduce batch processing of log messages to improve efficiency.
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
 * Sends log messages to the coralogix logging service.
 *
 * You can customize the host, application and subsystem per log
 * message by specifying the appropriate fields.
 *
 * @class
 * @implements Logger
 * @param {string|Secret} apikey – Your coralogix api key
 * @param {string} app – Name of the app under which the log messages should be categorized
 * @param {string} subsystem – Name of the subsystem under which
 * @param {string} [opts.host=os.hostname()] The hostname under which to categorize the messages
 * @param {string} [opts.apiurl='https://api.coralogix.com/api/v1/']; where the coralogix api can be found; for testing; where the coralogix api can be found; for testing
 */
class CoralogixLogger extends FormattedLoggerBase {
  /**
   * Name of the app under which the log messages should be categorized
   * @memberOf CoralogixLogger#
   * @member {Secret} apikey
   */

  /**
   * Name of the app under which the log messages should be categorized
   * @memberOf CoralogixLogger#
   * @member {string} app
   */

  /**
   * Name of the subsystem under which the log messages should be categorized
   * @memberOf CoralogixLogger#
   * @member {string} subsystem
   */

  /**
   * The hostname under which to categorize the messages
   * @memberOf CoralogixLogger#
   * @member {string} host
   */

  /* istanbul ignore next */
  constructor(apikey, app, subsystem, opts = {}) {
    const {
      host = hostname(),
      apiurl = 'https://api.coralogix.com/api/v1/',
      formatter = messageFormatJsonString,
      ...rest
    } = opts;
    super({ formatter, ...rest });
    assign(this, {
      apikey: new Secret(apikey),
      apiurl,
      app,
      subsystem,
      host,
      // use connection pool
      _agent: new https.Agent({
        keepAlive: true,
        maxSockets: 32,
      }),
    });
  }

  async _logImpl(payload, fields) {
    for (const t of [5, 10, 15]) {
      try {
        return await this._sendRequest(payload, fields);
      } catch (e) {
        await new Promise((res) => setTimeout(res, t));
      }
    }

    /* istanbul ignore next */
    return this._sendRequest(payload, fields);
  }

  async _sendRequest(payload, fields) {
    const {
      application = this.app,
      subsystem = this.subsystem,
      host = this.host,
    } = fields;
    return phin({
      url: path.join(this.apiurl, '/logs'),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      core: {
        agent: this._agent,
      },
      data: {
        privateKey: this.apikey.secret,
        applicationName: application,
        subsystemName: subsystem,
        computerName: host,
        logEntries: [{
          timestamp: CoralogixLogger._preciseTime(fields.timestamp),
          text: payload,
          severity: _logLevelMapping[fields.level],
        }],
      },
    });
  }

  static _preciseTime(ts) {
    try {
      return Number(BigDate.preciseTime(ts));
    } catch (e) {
      return new Date().getTime();
    }
  }
}

module.exports = { CoralogixLogger };
