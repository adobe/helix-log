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

/* eslint-env mocha */

const assert = require('assert');
const {
  assertAsyncLogs, assertLogs, recordLogs, recordAsyncLogs,
  info, verbose, error, rootLogger, ConsoleLogger,
} = require('../src');

it('recordLogs, assertLogs', () => {
  // assertLogs: without opts, recordLogs: with opts
  assertLogs(() => {
    info('Hello World');
    verbose('Foo');
    error('Bar');
  },
  '[INFO] Hello World\n'
    + '[ERROR] Bar\n');

  // Default logger restored
  assert(rootLogger.loggers.get('default') instanceof ConsoleLogger);

  // assertLogs: with opts, recordLogs: with opts
  assertLogs({ level: 'warn' }, () => {
    info('Hello World');
    verbose('Foo');
    error('Bar');
  }, '[ERROR] Bar\n');
  assert(rootLogger.loggers.get('default') instanceof ConsoleLogger);

  // recordLogs: with opts
  const logs = recordLogs(() => {
    info('Hello World');
    verbose('Foo');
    error('Bar');
  });
  assert(rootLogger.loggers.get('default') instanceof ConsoleLogger);
  assert.strictEqual(logs,
    '[INFO] Hello World\n'
    + '[ERROR] Bar\n');

  // Exception safety
  let ex;
  try {
    recordLogs(() => {
      throw new Error();
    });
  } catch (e) {
    ex = e;
  }
  assert(ex instanceof Error);
  assert(rootLogger.loggers.get('default') instanceof ConsoleLogger);
});

it('recordAsyncLogs, assertAsyncLogs', async () => {
  await assertAsyncLogs(async () => {
    info('Hello World');
    await new Promise((res) => setImmediate(res));
    verbose('Foo');
    await new Promise((res) => setImmediate(res));
    error('Bar');
  }, '[INFO] Hello World\n[ERROR] Bar\n');
  assert(rootLogger.loggers.get('default') instanceof ConsoleLogger);

  await assertAsyncLogs({ level: 'warn' }, async () => {
    info('Hello World');
    await new Promise((res) => setImmediate(res));
    verbose('Foo');
    await new Promise((res) => setImmediate(res));
    error('Bar');
  }, '[ERROR] Bar\n');
  assert(rootLogger.loggers.get('default') instanceof ConsoleLogger);

  const logs = await recordAsyncLogs(async () => {
    info('Hello World');
    await new Promise((res) => setImmediate(res));
    verbose('Foo');
    await new Promise((res) => setImmediate(res));
    error('Bar');
  });
  assert.strictEqual(logs,
    '[INFO] Hello World\n'
    + '[ERROR] Bar\n');
  assert(rootLogger.loggers.get('default') instanceof ConsoleLogger);

  // Exception safety
  let ex;
  try {
    await recordAsyncLogs(() => {
      throw new Error();
    });
  } catch (e) {
    ex = e;
  }
  assert(ex instanceof Error);
  assert(rootLogger.loggers.get('default') instanceof ConsoleLogger);
});
