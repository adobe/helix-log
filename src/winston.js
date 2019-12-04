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
const { identity } = require('ferrum');
const WinstonTransport = require('winston-transport');
const { LEVEL, MESSAGE, SPLAT } = require('triple-beam');
const {
  rootLogger,
  __handleLoggingExceptions,
  makeLogMessage,
} = require('./log');

/**
 * Winston transport that forwards any winston log messages to
 * the specified helix-log logger.
 *
 * ```
 * const winston = require('winston');
 * const { WinstonTransportInterface } = require('helix-log');
 *
 * const myWinsonLogger = W.createLogger({
 *   transports: [new WinstonTransportInterface()]
 * });
 *
 * // Will log 'Hello World' to the rootLogger with the fields:
 * // {category: 'testing'}.
 * myWinsonLogger.info('Hello World', category: 'testing');
 * ```
 *
 * @class
 * @implements WinstonTransport
 * @implements LoggingInterface
 * @param {Object} opts – Options as specified by WinstonTransport
 *   AND by LoggingInterface; both sets of options are supported
 * @param {String} opts.level – This is the level as specified by WinstonTransport.
 *   If your winston instance uses custom log levels not supported by
 *   helix-log you can use the filter to map winston log levels to helix
 *   log ones.
 */
class WinstonTransportInterface extends WinstonTransport {
  constructor(opts = {}) {
    // NOTE: ADAPTED FROM InterfaceBase
    const {
      logger = rootLogger,
      filter = identity,
      defaultFields = {},
      winstonOpts,
    } = opts;
    super(winstonOpts);
    assign(this, { logger, filter, defaultFields });
  }

  log(winstonMsg, callback) {
    setImmediate(() => this.emit('logged', winstonMsg));

    // NOTE: ADAPTED FROM InterfaceBase
    __handleLoggingExceptions(winstonMsg, this.logger, async () => {
      const {
        [LEVEL]: _0, [MESSAGE]: _1, [SPLAT]: _2, ...fields_
      } = winstonMsg;
      const fields = this.filter(makeLogMessage(fields_));
      if (fields !== undefined) {
        try {
          await this.logger.log({ ...this.defaultFields, ...fields });
        } finally {
          callback();
        }
      }
    });
  }
}

module.exports = { WinstonTransportInterface };
