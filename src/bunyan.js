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

const { type } = require('ferrum');
const { InterfaceBase } = require('./log');

/**
 * Remove the default fields emitted by buyan.
 *
 * These fields are added by bunyan by default but are often not of
 * much interest (like name, bunyanLevel, or `v`) or can be easily added
 * again later for data based loggers where this information might be
 * valuable (e.g. hostname, pid).
 *
 * Use like this:
 *
 * @example
 * ```
 * const bunyan = require('bunyan');
 * const { BunyanStreamInterface, eraseBunyanDefaultFields } = require('helix-log');
 *
 * const logger = bunyan.createLogger({name: 'helixLogger'});
 * logger.addStream(BunyanStreamInterface.createStream({
 *   filter: eraseBunyanDefaultFields
 * }));
 * ```
 *
 * @function
 * @param {Object} fields
 * @returns {Object}
 */
// eslint-disable-next-line
const eraseBunyanDefaultFields = ({ name, hostname, pid, bunyanLevel, v, ...rest }) => rest;

/**
 * Bunyan stream that can be used to forward any bunyan messages
 * to helix log.
 *
 * @example
 * ```
 * const bunyan = require('bunyan');
 * const { BunyanStreamInterface } = require('helix-log');
 *
 * const logger = bunyan.createLogger({name: 'helixLogger'});
 * logger.addStream(BunyanStreamInterface.createStream());
 * ```
 *
 * or
 *
 * ```
 * const logger = bunyan.createLogger({
 *    name: 'helixLogger',
 *    streams: [
 *      BunyanStreamInterface.createStream()
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
 *        stream: new BunyanStreamInterface(rootLogger),
 *      };
 *    ],
 * });
 * ```
 *
 * @class
 * @implements LoggingInterface
 */
class BunyanStreamInterface extends InterfaceBase {
  static createStream(...args) {
    return {
      type: 'raw',
      stream: new this(...args),
    };
  }

  write(payload) {
    /* istanbul ignore next */
    if (type(payload) !== Object) {
      throw new Error('BunyanStreamInterface requires a raw stream. Please use `"type": "raw"` when setting up the bunyan stream.');
    }

    const {
      msg, time, level, ...fields
    } = payload;
    this._logImpl({
      ...fields,
      message: [msg],
      level: this._bunyan2hlxLevel(level),
      bunyanLevel: level,
      timestamp: new Date(time),
    });
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

module.exports = { eraseBunyanDefaultFields, BunyanStreamInterface };
