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

const { dict, assertEquals } = require('ferrum');
const { MemLogger, messageFormatJson } = require('./log');

/**
 * Message format used for comparing logs in tests.
 *
 * Pretty much just messageFormatJson, but removes the time stamp
 * because that is hard to compare since it is different each time...
 *
 * If other highly variable fields are added in the future (e.g. id = uuidgen())
 * these shall be removed too.
 *
 * @function
 * @param {Message} fields
 * @returns {Object}
 */
const messageFormatJsonStatic = (fields) => {
  const r = messageFormatJson(fields);
  delete r.timestamp;
  return r;
};

/**
 * Record the log files with debug granularity while the given function is running.
 *
 * While the logger is recording, all other loggers are disabled.
 * If this is not your desired behaviour, you can use the MemLogger
 * manually.
 *
 * @example
 * ```
 * recordLogs(() => {
 *   info('Hello World');
 *   err('Nooo');
 * });
 * ```
 *
 * will return something like this:
 *
 * ```
 * [
 *   { level: 'info', message: 'Hello World', timestamp: '...' },
 *   { level: 'error', message: 'Noo', timestamp: '...' }
 * ]
 * ```
 *
 * @function
 * @param {Logger} rootLogger root logger that is used for recording
 * @param {Object} opts – optional first parameter; options passed to MemLogger
 * @param {Function} fn - The logs that this code emits will be recorded.
 * @returns {string} The logs that where produced by the codee
 */
const recordLogs = (rootLogger, opts, fn) => {
  if (opts instanceof Function) {
    return recordLogs(rootLogger, {}, opts);
  }

  const backup = rootLogger.loggers;
  const logger = new MemLogger(opts);
  try {
    // eslint-disable-next-line no-param-reassign
    rootLogger.loggers = dict({ default: logger });
    fn();
  } finally {
    // eslint-disable-next-line no-param-reassign
    rootLogger.loggers = backup;
  }

  return logger.buf;
};

/**
 * Assert that a piece of code produces a specific set of log messages.
 *
 * @example
 * ```
 * const { assertLogs, info, err } = require('@adobe/helix-shared').log;
 *
 * assertLogs(() => {
 *   info('Hello World');
 *   err('Nooo');
 * }, [
 *   { level: 'info', message: 'Hello World' },
 *   { level: 'error', message: 'Noo' }
 * ]);
 * ```
 *
 * @function
 * @param {Logger} rootLogger root logger that is used for recording
 * @param {Object} opts – optional first parameter; options passed to MemLogger
 * @param {Function} fn - The logs that this code emits will be recorded.
 * @param {string} logs
 */
const assertLogs = (rootLogger, opts, fn, logs) => {
  if (opts instanceof Function) {
    assertLogs(rootLogger, {}, opts, fn);
  } else {
    assertEquals(
      recordLogs(rootLogger, { formatter: messageFormatJsonStatic, ...opts }, fn),
      logs,
    );
  }
};

/**
 * Async variant of recordLogs.
 *
 * Note that using this is a bit dangerous as other async procedures
 * may also emit log messages while this procedure is running
 *
 * @function
 * @param {Logger} rootLogger root logger that is used for recording
 * @param {Object} opts – optional first parameter; options passed to MemLogger
 * @param {Function} fn - The logs that this code emits will be recorded.
 * @returns {string} The logs that where produced by the code
 */
const recordAsyncLogs = async (rootLogger, opts, fn) => {
  if (opts instanceof Function) {
    return recordAsyncLogs(rootLogger, {}, opts);
  }

  const backup = rootLogger.loggers;
  const logger = new MemLogger(opts);
  try {
    // eslint-disable-next-line no-param-reassign
    rootLogger.loggers = dict({ default: logger });
    await fn();
  } finally {
    // eslint-disable-next-line no-param-reassign
    rootLogger.loggers = backup;
  }

  return logger.buf;
};

/**
 * Async variant of assertLogs
 *
 * Note that using this is a bit dangerous as other async procedures
 * may also emit logs while this async procedure is running.
 *
 * @function
 * @param {Logger} rootLogger root logger that is used for recording
 * @param {Object} opts – optional first parameter; options passed to MemLogger
 * @param {Function} fn - The logs that this code emits will be recorded.
 * @param {string} logs
 */
const assertAsyncLogs = async (rootLogger, opts, fn, logs) => {
  if (opts instanceof Function) {
    await assertAsyncLogs(rootLogger, {}, opts, fn);
  } else {
    assertEquals(
      await recordAsyncLogs(rootLogger, { formatter: messageFormatJsonStatic, ...opts }, fn),
      logs,
    );
  }
};

module.exports = {
  messageFormatJsonStatic, recordLogs, assertLogs, recordAsyncLogs, assertAsyncLogs,
};
