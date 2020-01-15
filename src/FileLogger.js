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
const { type } = require('ferrum');
const { openSync, closeSync, writeSync } = require('fs');
const { messageFormatTechnical } = require('./messageFormats.js');
const FormattedLoggerBase = require('./FormattedLoggerBase.js');

/**
 * Logger specifically designed for logging to unix file descriptors.
 *
 * This logger is synchronous: It uses blocking syscalls and thus guarantees
 * that all data is written even if process.exit() is called immediately after
 * logging.
 * For normal files this is not a problem as linux will never block when writing
 * to files, for sockets, pipes and ttys this might block the process for a considerable
 * time.
 *
 * Formatter MUST produce strings. Default formatter is messageFormatTechnical.
 *
 * @class
 * @implements Logger
 * @param {string|Integer} name - The path of the file to log to
 *   OR the unix file descriptor to log to.
 */
class FileLogger extends FormattedLoggerBase {
  /**
   * The underlying operating system file descriptor.
   * @memberOf FileLogger#
   * @member {Integer} fd
   */

  constructor(name, opts = {}) {
    super({ formatter: messageFormatTechnical, ...opts });
    const fd = type(name) === Number ? name : openSync(name, 'a');
    assign(this, { fd });
  }

  _logImpl(str) {
    writeSync(this.fd, `${str}\n`);
  }

  close() {
    closeSync(this.fd);
  }
}

module.exports = FileLogger;
