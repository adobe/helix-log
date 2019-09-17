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
const { type, isdef } = require('ferrum');
const { rootLogger } = require('./log');

/**
 * Bunyan stream that can be used to forward any bunyan messages
 * to helix log.
 *
 * ```
 * const bunyan = require('bunyan');
 * const { Bunyan2HelixLog } = require('helix-log');
 *
 * const logger = bunyan.createLogger({name: 'helixLogger'});
 * logger.addStream(Bunyan2HelixLog.createStream());
 * ```
 *
 * or
 *
 * ```
 * const logger = bunyan.createLogger({
 *    name: 'helixLogger',
 *    streams: [
 *      Bunyan2HelixLog.createStream()
 *    ],
 * });
 * ```
 *
 * which is really shorthand for:
 *
 * ```
 * const logger = bunyan.createLogger({
 *    name: 'helixLogger',
 *    streams: [
 *      {
 *        type: 'raw',
 *        stream: new Bunyan2HelixLog(rootLogger),
 *      };
 *    ],
 * });
 * ```
 *
 * @param {HelixLogger} logger – The helix-log logger to…well…log top.
 *   If this is not given, the `rootLogger` will be used instead.
 */
class Bunyan2HelixLog {
  static createStream(...args) {
    return {
      type: 'raw',
      stream: new this(...args),
    };
  }

  constructor(logger) {
    assign(this, { logger });
  }

  write(payload) {
    if (type(payload) !== Object) {
      throw new Error('Bunyan2HelixLog requires a raw stream. Please use `"type": "raw"` when setting up the bunyan stream.');
    }

    const {
      msg, time, level, ...fields
    } = payload;
    const hlxFields = { timestamp: new Date(time), ...fields, bunyanLevel: level };
    const hlxOpts = { level: this._bunyan2hlxLevel(level) };
    this._helixLogger().log([msg, hlxFields], hlxOpts);
  }

  _helixLogger() {
    return isdef(this.logger) ? this.logger : rootLogger;
  }

  _bunyan2hlxLevel(lvl) {
    if (lvl < 10) {
      return 'silly';
    } else if (lvl < 20) {
      return 'trace';
    } else if (lvl < 30) {
      return 'debug';
    } else if (lvl < 40) {
      return 'info';
    } else if (lvl < 50) {
      return 'warn';
    } else if (lvl < 60) {
      return 'error';
    } else {
      return 'fatal';
    }
  }
}

module.exports = { Bunyan2HelixLog };
