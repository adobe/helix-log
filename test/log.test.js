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
/* eslint-disable no-console */

const assert = require('assert');
const stream = require('stream');
const fs = require('fs');
const { inspect, promisify } = require('util');
const { v4: uuidgen } = require('uuid');
const {
  black, bgRed, bgYellow, yellow, green, bgBlackBright, bgBlueBright,
  options: coloretteOpts,
} = require('colorette');
const {
  join, dict, pipe, filter, reject, map,
} = require('ferrum');
const {
  numericLogLevel, serializeMessage, ConsoleLogger,
  rootLogger, assertAsyncLogs, assertLogs, recordLogs, recordAsyncLogs,
  tryInspect, error, warn, info, verbose, debug, StreamLogger,
  FileLogger, MemLogger, MultiLogger, fatal, messageFormatSimple,
  messageFormatTechnical, messageFormatConsole, messageFormatJson,
} = require('../src/log');
const { ckEq } = require('./util');

const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);

coloretteOpts.enabled = true;

it('numericLogLevel', () => {
  assert.strictEqual(numericLogLevel('fatal'), 0);
  assert.throws(() => numericLogLevel('foo'));
});

class BrokenInspect {
  [inspect.custom]() {
    throw new Error('42');
  }
}

class BrokenClassName {}
Object.defineProperty(BrokenClassName, 'name', {
  get() {
    throw new Error('90');
  },
});

it('tryInspect', async () => {
  const ck = (ref, what) => assert.strictEqual(tryInspect(what), ref);
  const logs = await recordAsyncLogs(async () => {
    ck('undefined', undefined);
    ck('42', 42);
    ck('{ foo: 42 }', { foo: 42 });
    ck('{ foo: [ 1, 2, 3, 4 ] }', { foo: [1, 2, 3, 4] });
    ck('BrokenInspect {}', new BrokenInspect());
    ck('{ foo: { bar: BrokenInspect {} } }', { foo: { bar: new BrokenInspect() } });
    ck('<<COULD NOT INSPECT>>', new BrokenClassName());
    ck('<<COULD NOT INSPECT>>', { foo: { bar: new BrokenClassName() } });

    // Wait a couple of ticks so we can be sure all the error messages
    // where printed
    for (let i = 0; i < 20; i += 1) {
      await new Promise((res) => setImmediate(res));
    }
  });

  const filteredLogs = pipe(
    logs.split('\n'),
    filter((line) => line.startsWith('[ERROR]')),
    join('\n'),
  );

  assert.strictEqual(filteredLogs,
    '[ERROR] Error while inspecting object for log message: Error: 42\n'
    + '[ERROR] Error while inspecting object for log message: Error: 42\n'
    + '[ERROR] Error while inspecting object for log message: Error: 90\n'
    + '[ERROR] Error while inspecting object for log message: Error: 90\n'
    + '[ERROR] Error while inspecting object for log message: Error: 90\n'
    + '[ERROR] Error while inspecting object for log message: Error: 90');
});

it('serializeMessage', () => {
  const ck = (ref, ...msg) => assert.strictEqual(serializeMessage(msg), ref);
  ck('');
  ck('42', 42);
  ck('Hello 42 World', 'Hello', 42, 'World');
  ck('{ foo: 42 }', { foo: 42 });
  ck('{ foo: [ 1, 2, 3, 4 ] }', { foo: [1, 2, 3, 4] });

  class Foo {}
  const f = new Foo();
  f.bar = 42;
  ck('{ foo: Foo { bar: 42 } }', { foo: f });
});

it('messageFormatSimple', () => {
  assert.strictEqual(
    messageFormatSimple(['Hello', 42, 'World'], { level: 'error' }),
    '[ERROR] Hello 42 World',
  );
});

it('messageFormatTechnical', () => {
  const ser = messageFormatTechnical(['Hello', 42, 'World'], { level: 'error' });
  assert(ser.match(/^\[ERROR \d{4}-\d\d-\d\d \d\d:\d\d:\d\d.\d+ [+-]\d\d:\d\d\] Hello 42 World$/));
});

it('messageFormatConsole', () => {
  const ck = (level, expect) => assert.strictEqual(
    messageFormatConsole(['Hello', 42, 'World', { foo: 'asd' }], { level }),
    expect,
  );
  ck('fatal', bgRed(black(`[FATAL] Hello ${yellow('42')} World { foo: ${green("'asd'")} }`)));
  ck('error', `${bgRed(black('[ERROR]'))} Hello ${yellow('42')} World { foo: ${green("'asd'")} }`);
  ck('warn', `${bgYellow(black('[WARN]'))} Hello ${yellow('42')} World { foo: ${green("'asd'")} }`);
  ck('info', `Hello ${yellow('42')} World { foo: ${green("'asd'")} }`);
  ck('verbose', `${bgBlueBright(black('[VERBOSE]'))} Hello ${yellow('42')} World { foo: ${green("'asd'")} }`);
  ck('debug', `${bgBlackBright('[DEBUG]')} Hello ${yellow('42')} World { foo: ${green("'asd'")} }`);
  ck('trace', `${bgBlackBright('[TRACE]')} Hello ${yellow('42')} World { foo: ${green("'asd'")} }`);
});

it('messageFormatJson', () => {
  const ck = (level, msg, expect) => {
    const gen = messageFormatJson(msg, { level });
    assert(gen.timestamp instanceof Date);
    delete gen.timestamp;
    ckEq(gen, expect);
  };

  ck('error', ['Foo bar', { hello: 42 }], {
    hello: 42,
    message: 'Foo bar',
    level: 'error',
  });

  ck('error', ['Foo bar', { hello: 42, level: 'fnord' }], {
    hello: 42,
    message: 'Foo bar',
    level: 'fnord',
  });

  ck('error', ['Foo bar'], {
    message: 'Foo bar',
    level: 'error',
  });

  ck('error', [{ bang: 42 }], {
    bang: 42,
    level: 'error',
  });

  ck('error', [{ bang: 42, message: 'nord' }], {
    bang: 42,
    message: 'nord',
    level: 'error',
  });

  ck('error', [42], {
    message: '42',
    level: 'error',
  });
});

class StringStream extends stream.Writable {
  constructor() {
    super();
    this._buf = [];
  }

  _write(chunk, enc, next) {
    this._buf.push(chunk);
    next();
  }

  extract() {
    const r = join(this._buf, '');
    this._buf = [];
    return r;
  }
}

/** Record stderr; strips all color */
const recordStderr = async (fn) => {
  const ss = new StringStream();
  const stderrBackup = console._stderr;
  try {
    console._stderr = ss;
    await fn();
  } finally {
    console._stderr = stderrBackup;
  }

  return ss.extract();
};

it('log()', async () => {
  const backup = rootLogger.loggers;
  try {
    rootLogger.loggers = null;

    // Just testing exception safety here; logging is tested
    // abundantly in testLogger
    const out = await recordStderr(() => error('Hello World', { foo: 42 }));
    assert(out.match('No implementation of trait Sequence for null of type null.'));
  } finally {
    rootLogger.loggers = backup;
  }
});

const logOutputSimple = '[FATAL] { foo: 23 }\n'
  + '[ERROR] \n'
  + '[ERROR] 42\n'
  + '[WARN] Hello 42 World\n'
  + '[INFO] { foo: 42 }\n'
  + '[VERBOSE] { foo: [ 1, 2, 3, 4 ] }\n'
  + '[DEBUG] Nooo\n';

const logOutputFatalConsole = `${bgRed(black(`[FATAL] { foo: ${yellow('23')} }`))}\n`;

const testLogger = (logger) => {
  const loggersBackup = rootLogger.loggers;

  try {
    rootLogger.loggers = dict({ default: logger });

    fatal({ foo: 23 });
    error();
    error(42);
    warn('Hello', 42, 'World');
    info({ foo: 42 });
    verbose({ foo: [1, 2, 3, 4] });
    debug('Nooo');
  } finally {
    rootLogger.loggers = loggersBackup;
  }
};

it('ConsoleLogger', async () => {
  let out = await recordStderr(() => testLogger(new ConsoleLogger({ level: 'debug', formatter: messageFormatSimple })));
  assert.strictEqual(out, logOutputSimple);

  out = await recordStderr(() => testLogger(new ConsoleLogger({ level: 'fatal' })));
  assert.strictEqual(out, logOutputFatalConsole);
});

it('StreamLogger', () => {
  const ss = new StringStream();

  testLogger(new StreamLogger(ss, { level: 'debug', formatter: messageFormatSimple }));
  assert.strictEqual(ss.extract(), logOutputSimple);

  testLogger(new StreamLogger(ss, { level: 'fatal' }));
  assert(ss.extract().match(/^\[FATAL \d{4}-\d\d-\d\d \d\d:\d\d:\d\d.\d+ [+-]\d\d:\d\d\] \{ foo: 23 \}\n$/));
});

it('FileLogger', async () => {
  const tmpfile = `/tmp/helix-shared-testfile-${uuidgen()}.txt`;

  try {
    let logger = new FileLogger(tmpfile, { level: 'debug', formatter: messageFormatSimple });
    testLogger(logger);
    logger.close();
    assert.strictEqual(await readFile(tmpfile, { encoding: 'utf-8' }), logOutputSimple);

    // Tests that append mode is properly used
    logger = new FileLogger(tmpfile, { level: 'fatal' });
    testLogger(logger);
    logger.close();
    const s = await readFile(tmpfile, { encoding: 'utf-8' });
    assert(s.startsWith(logOutputSimple));
    assert(s.match(/\[FATAL \d{4}-\d\d-\d\d \d\d:\d\d:\d\d.\d+ [+-]\d\d:\d\d\] \{ foo: 23 \}$/m));
  } finally {
    await unlink(tmpfile);
  }
});

it('MemLogger', () => {
  let logger = new MemLogger({ level: 'debug' });
  testLogger(logger);
  assert.strictEqual(`${join(logger.buf, '\n')}\n`, logOutputSimple);

  logger = new MemLogger({ level: 'fatal', formatter: messageFormatConsole });
  testLogger(logger);
  assert.strictEqual(`${join(logger.buf, '\n')}\n`, logOutputFatalConsole);
});

it('MultiLogger', async () => {
  const foo = new MemLogger({ level: 'debug' });
  const bar = new MemLogger({ level: 'debug' });
  const logger = new MultiLogger(dict({ foo, bar }));
  testLogger(logger);
  assert.strictEqual(`${join(foo.buf, '\n')}\n`, logOutputSimple);
  assert.strictEqual(`${join(bar.buf, '\n')}\n`, logOutputSimple);

  // ExceptionSafety

  const backup = rootLogger.loggers;
  foo.buf = null; // Intentionally break foo
  try {
    rootLogger.loggers = dict({ default: logger });
    info('Hello World');
  } finally {
    // Wait a couple of ticks so we can be sure all the error messages
    // where printed
    for (let i = 0; i < 10; i += 1) {
      await new Promise((res) => setTimeout(res, 1));
    }
    rootLogger.loggers = backup;
  }

  const logs = pipe(
    (`${join(bar.buf, '\n')}\n`).split('\n'),
    reject((line) => line.match(/^\s/)),
    map((line) => `${line}\n`),
    join(''),
  );

  assert.strictEqual(logs, `${logOutputSimple}[INFO] Hello World\n`
    + '[ERROR] MultiLogger encountered exception while logging to foo - MemLogger { level: \'debug\', formatter: [Function: messageFormatSimple], fmtOpts: {}, buf: null } :  TypeError: Cannot read property \'push\' of null\n\n');
});

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
  },
  '[INFO] Hello World\n'
    + '[ERROR] Bar\n');
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
