
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
  type, identity, typename, empty,
} = require('ferrum');
const {
  __handleLoggingExceptions, numericLogLevel, makeLogMessage, tryInspect,
} = require('./utils.js');
const { rootLogger } = require('./rootLogger.js');

/**
 * Can be used as a base class/helper for implementing logging interfaces.
 *
 * This will make sure that all the required fields are set to their
 * default value, apply the filter, drop the message if the level is
 * too low or if the filter returned undefined and will then forward
 * the message to the logger configured.
 *
 * This also wraps the entire logging logic into a promise enabled/async
 * error handler that will log any errors using the rootLogger.
 *
 * @example
 * ```
 * class MyTextInterface extends InterfaceBase {
 *   logText(str) {
 *     this._logImpl({ message: [str] });
 *   }
 * };
 *
 * const txt = new MyTextInterface({ logger: rootLogger });
 * txt.logText("Hello World");
 * ```
 *
 * @class
 * @param {Object} opts – Optional, named parameters
 * @param {string} [opts.level='silly'] The minimum log level to sent to the logger
 * @param {Logger} [opts.logger = rootLogger] The helix logger to use
 * @param {Function} [opts.filter=identity] Will be given every log message to perform
 *   arbitrary transformations; must return either another valid message object or undefined
 *   (in which case the message will be dropped).
 * @param {object} [opts.defaultFields] Additional log fields to add to every log message.
 */
class InterfaceBase {
  constructor({
    logger = rootLogger, level = 'silly', filter = identity, defaultFields = {}, ...unknown
  } = {}) {
    assign(this, {
      logger, level, filter, defaultFields,
    });
    if (!empty(unknown)) {
      throw new Error(`Unknown named options given to ${typename(type(this))}: ${tryInspect(unknown)}`);
    }
  }

  _logImpl(fields_) {
    __handleLoggingExceptions(fields_, this.logger, async () => {
      const fields = this.filter({ ...this.defaultFields, ...makeLogMessage(fields_) });
      if (fields !== undefined && numericLogLevel(fields.level) <= numericLogLevel(this.level)) {
        await this.logger.log(fields);
      }
    });
  }
}

module.exports = InterfaceBase;
