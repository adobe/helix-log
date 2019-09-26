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
const { join } = require('ferrum');
const {
  MemLogger, LogFacade, messageFormatJson, JsonifyForLog,
} = require('../src/index');

class MyTestClass {
  constructor(value) {
    this.value = value;
  }

  [JsonifyForLog.sym]() {
    return `[TestClass: ${this.value}]`;
  }
}

const cleanTimestamp = (buf) => {
  buf.forEach((msg) => {
    // eslint-disable-next-line no-param-reassign
    delete msg.timestamp;
  });
  return buf;
};

describe('LogFacade', () => {
  it('logs', () => {
    const logger = new MemLogger({ level: 'silly' });
    const log = new LogFacade(logger);
    log.silly('silly', 0);
    log.trace('trace', 1);
    log.debug('debug', 2);
    log.verbose('verbose', 3);
    log.info('info', 4);
    log.warn('warn', 5);
    log.error('error', 6);
    log.fatal('fatal', 7);
    assert.strictEqual(`${join(logger.buf, '\n')}`, '[SILLY] silly 0\n[TRACE] trace 1\n[DEBUG] debug 2\n[VERBOSE] verbose 3\n[INFO] info 4\n[WARN] warn 5\n[ERROR] error 6\n[FATAL] fatal 7');
  });

  it('does not log data', () => {
    const logger = new MemLogger({ level: 'silly' });
    const log = new LogFacade(logger, { foo: 42 });
    log.debug('debug', 0);
    assert.strictEqual(`${join(logger.buf, '\n')}`, '[DEBUG] debug 0');
  });

  it('logs data with the json format', () => {
    const logger = new MemLogger({
      level: 'silly',
      formatter: messageFormatJson,
    });
    const log = new LogFacade(logger, { foo: 42 });
    log.debug('debug', 0);

    const out = cleanTimestamp(logger.buf);
    assert.deepEqual(out, [{
      foo: 42,
      level: 'debug',
      message: 'debug 0',
    }]);
  });

  it('logs data with custom traits', () => {
    const logger = new MemLogger({
      level: 'silly',
      formatter: messageFormatJson,
    });
    const log = new LogFacade(logger, { foo: 42, test: new MyTestClass('hello') });
    log.debug('debug', 0);

    const out = cleanTimestamp(logger.buf);
    assert.deepEqual(out, [{
      foo: 42,
      level: 'debug',
      message: 'debug 0',
      test: '[TestClass: hello]',
    }]);
  });

  it('can change the data', () => {
    const logger = new MemLogger({
      level: 'silly',
      formatter: messageFormatJson,
    });
    const log = new LogFacade(logger, { foo: 42 });
    log.debug('debug', 0);
    log.data({
      foo: 'new value',
    });
    log.debug('debug', 0);

    const out = cleanTimestamp(logger.buf);
    assert.deepEqual(out, [{
      foo: 42,
      level: 'debug',
      message: 'debug 0',
    }, {
      foo: 'new value',
      level: 'debug',
      message: 'debug 0',
    }]);
  });

  it('can create child loggers data with the json format', () => {
    const logger = new MemLogger({
      level: 'silly',
      formatter: messageFormatJson,
    });
    const log = new LogFacade(logger, { foo: 'base', bar: 42 });
    log.debug('debug', 0);
    const c = log.child({
      test: 'hello',
      foo: 'override',
    });
    c.debug('child logger');
    log.debug('original logger');

    const out = cleanTimestamp(logger.buf);
    assert.deepEqual(out, [{
      bar: 42,
      foo: 'base',
      level: 'debug',
      message: 'debug 0',
    }, {
      bar: 42,
      foo: 'override',
      level: 'debug',
      message: 'child logger',
      test: 'hello',
    }, {
      bar: 42,
      foo: 'base',
      level: 'debug',
      message: 'original logger',
    }]);
  });
});
