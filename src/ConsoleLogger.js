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
/* eslint-disable no-console */
const { assign } = Object;
const { messageFormatConsole } = require('./messageFormats.js');
const FormattedLoggerBase = require('./FormattedLoggerBase.js');

/**
 * Logger that is especially designed to be used in node.js
 * Print's to stderr; Marks errors, warns & debug messages
 * with a colored `[ERROR]`/... prefix.
 *
 * Formatter MUST produce strings. Default formatter is messageFormatConsole.
 *
 * @implements Logger
 * @class
 * @param {Writable} [opts.stream=console._stderr] A writable stream to log to.
 */
class ConsoleLogger extends FormattedLoggerBase {
  /**
   * Writable stream to write log messages to. Usually console._stderr.
   * @memberOf ConsoleLogger#
   * @member {Writable} stream
   */
  constructor({ stream = console._stderr, ...rest } = {}) {
    super({ formatter: messageFormatConsole, ...rest });
    assign(this, { stream });
  }

  _logImpl(str) {
    this.stream.write(`${str}\n`);
  }
}

module.exports = ConsoleLogger;
