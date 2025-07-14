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

import assert from 'node:assert';
import {
  assertAsyncLogs,
  assertLogs,
  ConsoleLogger, createDefaultLogger,
  messageFormatSimple,
  recordAsyncLogs,
  recordLogs, SimpleInterface,
} from '../src/index.js';

it('recordLogs, assertLogs', () => {
  const rootLogger = createDefaultLogger();
  const log = new SimpleInterface({ logger: rootLogger });
  // assertLogs: without opts, recordLogs: with opts
  assertLogs(rootLogger, () => {
    log.info('Hello World');
    log.verboseFields('Foo', { x: 42 });
  }, [
    { level: 'info', message: 'Hello World' },
    { level: 'verbose', message: 'Foo', x: 42 },
  ]);

  // Default logger restored
  assert(rootLogger.loggers.get('default') instanceof ConsoleLogger);

  // assertLogs: with opts, recordLogs: with opts
  assertLogs(rootLogger, { level: 'warn', formatter: messageFormatSimple }, () => {
    log.info('Hello World');
    log.warnFields('Foo', { foo: 42 });
    log.error('Bar');
  }, [
    '[WARN] Foo { foo: 42 }',
    '[ERROR] Bar',
  ]);

  // Default logger restored
  assert(rootLogger.loggers.get('default') instanceof ConsoleLogger);

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
  const rootLogger = createDefaultLogger();
  const log = new SimpleInterface({ logger: rootLogger });

  // assertLogs: without opts, recordLogs: with opts
  await assertAsyncLogs(rootLogger, async () => {
    await new Promise((res) => {
      setImmediate(res);
    });
    log.info('Hello World');
    await new Promise((res) => {
      setImmediate(res);
    });
    log.verboseFields('Foo', { x: 42 });
    await new Promise((res) => {
      setImmediate(res);
    });
  }, [
    { level: 'info', message: 'Hello World' },
    { level: 'verbose', message: 'Foo', x: 42 },
  ]);

  // Default logger restored
  assert(rootLogger.loggers.get('default') instanceof ConsoleLogger);

  // assertLogs: with opts, recordLogs: with opts
  await assertAsyncLogs(rootLogger, { level: 'warn', formatter: messageFormatSimple }, async () => {
    await new Promise((res) => {
      setImmediate(res);
    });
    log.info('Hello World');
    await new Promise((res) => {
      setImmediate(res);
    });
    log.warnFields('Foo', { foo: 42 });
    await new Promise((res) => {
      setImmediate(res);
    });
    log.error('Bar');
  }, [
    '[WARN] Foo { foo: 42 }',
    '[ERROR] Bar',
  ]);

  // Default logger restored
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
