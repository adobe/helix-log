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

const assert = require('assert');
const { dict } = require('ferrum');
const { rootLogger, MemLogger } = require('./log');

/**
 * Record the log files with debug granularity while the given function is running.
 *
 * While the logger is recording, all other loggers are disabled.
 * If this is not your desired behaviour, you can use the MemLogger
 * manually.
 *
 * ```
 * const { assertEquals } = require('ferrum');
 * const { recordLogs, info, err } = require('@adobe/helix-shared').log;
 *
 * const logs = recordLogs(() => {
 *   info('Hello World\n');
 *   err('Nooo')
 * });
 * assertEquals(logs, 'Hello World\n[ERROR] Nooo');
 * ```
 *
 * @param {Object} opts – optional first parameter; options passed to MemLogger
 * @param {Function} fn - The logs that this code emits will be recorded.
 * @returns {String} The logs that where produced by the codee
 */
const recordLogs = (opts, fn) => {
  if (opts instanceof Function) {
    return recordLogs({}, opts);
  }

  const backup = rootLogger.loggers;
  const logger = new MemLogger(opts);
  try {
    rootLogger.loggers = dict({ default: logger });
    fn();
  } finally {
    rootLogger.loggers = backup;
  }
  return `${logger.buf.join('\n')}\n`;
};

/**
 * Assert that a piece of code produces a specific set of log messages.
 *
 * ```
 * const { assertLogs, info, err } = require('@adobe/helix-shared').log;
 *
 * assertLogs(() => {
 *   info('Hello World\n');
 *   err('Nooo')
 * }, multiline(`
 *   Hello World
 *   [ERROR] Nooo
 * `));
 * ```
 *
 * @param {Object} opts – optional first parameter; options passed to MemLogger
 * @param {Function} fn - The logs that this code emits will be recorded.
 * @param {String} logs
 */
const assertLogs = (opts, fn, logs) => {
  if (opts instanceof Function) {
    assertLogs({}, opts, fn);
  } else {
    assert.strictEqual(recordLogs(opts, fn), logs);
  }
};

/**
 * Async variant of recordLogs.
 *
 * Note that using this is a bit dangerous;
 *
 * ```
 * const { assertEquals } = require('ferrum');
 * const { recordAsyncLogs, info, err } = require('@adobe/helix-shared').log;
 *
 * const logs = await recordLogs(async () => {
 *   info('Hello World\n');
 *   await sleep(500);
 *   err('Nooo')
 * });
 * assertEquals(logs, 'Hello World\n[ERROR] Nooo');
 * ```
 *
 * @param {Object} opts – optional first parameter; options passed to MemLogger
 * @param {Function} fn - The logs that this code emits will be recorded.
 * @returns {String} The logs that where produced by the codee
 */
const recordAsyncLogs = async (opts, fn) => {
  if (opts instanceof Function) {
    return recordAsyncLogs({}, opts);
  }

  const backup = rootLogger.loggers;
  const logger = new MemLogger(opts);
  try {
    rootLogger.loggers = dict({ default: logger });
    await fn();
  } finally {
    rootLogger.loggers = backup;
  }
  return `${logger.buf.join('\n')}\n`;
};

/**
 * Async variant of assertLogs
 *
 * ```
 * const { assertAsyncLogs, info, err } = require('@adobe/helix-shared').log;
 *
 * await assertAsyncLogs(() => {
 *   info('Hello World\n');
 *   await sleep(500);
 *   err('Nooo')
 * }, multiline(`
 *   Hello World
 *   [ERROR] Nooo
 * `));
 * ```
 *
 * @param {Object} opts – optional first parameter; options passed to MemLogger
 * @param {Function} fn - The logs that this code emits will be recorded.
 * @param {String} logs
 */
const assertAsyncLogs = async (opts, fn, logs) => {
  if (opts instanceof Function) {
    await assertAsyncLogs({}, opts, fn);
  } else {
    assert.strictEqual(await recordAsyncLogs(opts, fn), logs);
  }
};

module.exports = {
  recordLogs, assertLogs, recordAsyncLogs, assertAsyncLogs,
};
