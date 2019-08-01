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

const phin = require('phin');
const {
  last, empty, size, take, type, TraitNotImplemented, list,
} = require('ferrum');
const { jsonifyForLog } = require('./serialize-json');
const { numericLogLevel, error, serializeMessage } = require('./log');

/**
 * Sends log messages to the loggly message logging service.
 *
 * @class
 * @implements Logger
 * @param {String} logglyToken - The token to use when authenticating with loggly.
 * @param {Object} opts – Configuration object; contains only one key at
 *   the moment: `level` - The log level which can be one of `error, warn,
 *   info, verbose` and `debug`.
 */
class LogglyLogger {
  /**
   * The token to use when authenticating with loggly.
   * @Member {String} logglyToken
   */

  /**
   * The minimum log level for messages to be printed.
   * Feel free to change to one of the levels described in the Logger
   * interface.
   * @member {string} level
   */

  /**
   * Options that will be passed to `serializeMessage()`;
   * Feel free to mutate or exchange.
   * @member {object} serializeOpts
   */

  constructor(logglyToken, opts = {}) {
    const { level = 'info', ...serializeOpts } = opts;
    Object.assign(this, { logglyToken, level, serializeOpts });
  }

  log(msg, opts = {}) {
    const { level = 'info' } = opts || {};
    if (numericLogLevel(level) > numericLogLevel(this.level)) {
      return undefined;
    }

    // eslint-disable-next-line no-console
    console.log('SEND', this._serializeMsg(level, msg));
    return phin({
      url: `http://logs-01.loggly.com/inputs/${this.logglyToken}/tag/http/`,
      method: 'POST',
      data: this._serializeMsg(level, msg),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  _serializeMsg(level, msg) {
    let data = {};

    const setReserved = (name, val) => {
      if (name in data) {
        error("Can't log the", name, 'field to loggly. It is a reserved field!');
      }
      data[name] = val;
    };

    // Try encoding the last item as json; provided there is a last
    // item; it is not a string and it can be encoded as json.
    if (!empty(msg) && type(last(msg)) !== String) {
      const lst = this._serializeLast(last(msg));
      if (type(lst) === Object) {
        data = lst;
        // eslint-disable-next-line no-param-reassign
        msg = list(take(msg, size(msg) - 1));
      }
    }

    // As advised by loggly staff, sending an explicit timestamp is a hidden feature
    // that allows us to preserve chronological consistency.
    // It currently doesn't work. Need to recheck with the loggly staff.
    setReserved('timestamp', new Date().getTime());
    setReserved('level', level);
    if (!empty(msg)) {
      setReserved('message', serializeMessage(msg, this.serializeOpts));
    }

    return data;
  }

  _serializeLast(one) {
    // Exceptions are encoded as the exception field in json
    if (one instanceof Error) {
      return this._serializeLast({ exception: one });
    }

    // Try json encoding the field; if this is supported
    try {
      return jsonifyForLog(one);
    } catch (er) {
      if (!(er instanceof TraitNotImplemented)) {
        throw er;
      }
    }

    return undefined;
  }
}

module.exports = { LogglyLogger };
