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
/* eslint-disable no-console, no-param-reassign */

const assert = require('assert');
const stream = require('stream');
const {
  openSync, readFileSync, ftruncateSync,
} = require('fs');
const { inspect } = require('util');
const { v4: uuidgen } = require('uuid');
const {
  black, bgRed, bgYellow, yellow, green, bgBlackBright, bgBlueBright,
} = require('colorette');
const {
  join, pipe, map, identity, size, exec, type, list, last,
} = require('ferrum');
const {
  numericLogLevel, serializeMessage, ConsoleLogger,
  recordAsyncLogs, tryInspect, messageFormatJsonString,
  FileLogger, MemLogger, MultiLogger, messageFormatSimple,
  messageFormatTechnical, messageFormatConsole, messageFormatJson,
  messageFormatJsonStatic, SimpleInterface, makeLogMessage,
  assertLogs, BigDate, deriveLogger,
  createDefaultLogger,
} = require('../src');
const { ckEq, ckThrows } = require('./util');

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
  const logger = createDefaultLogger();
  const ck = (ref, what) => assert.strictEqual(tryInspect(what, { logger }), ref);
  const logs = await recordAsyncLogs(logger, { formatter: messageFormatSimple }, async () => {
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

  ckEq(list(map(logs, (l) => l.replace(/\n.*$/gm, ''))), [
    '[ERROR] Error while inspecting object for log message: Error: 42',
    '[ERROR] Error while inspecting object for log message: Error [ERR_INTERNAL_ASSERTION]: Error [ERR_INTERNAL_ASSERTION]: Error: 42',
    '[ERROR] Error while inspecting object for log message: Error: 90',
    '[ERROR] Error while inspecting object for log message: Error: 90',
    '[ERROR] Error while inspecting object for log message: Error [ERR_INTERNAL_ASSERTION]: Error [ERR_INTERNAL_ASSERTION]: Error: 90',
    '[ERROR] Error while inspecting object for log message: Error [ERR_INTERNAL_ASSERTION]: Error [ERR_INTERNAL_ASSERTION]: Error: 90',
  ]);
});

it('serializeMessage', () => {
  const logger = createDefaultLogger();
  const ck = (ref, msg) => assert.strictEqual(serializeMessage(msg, { logger }), ref);
  ck('');
  ck('', []);
  ck('42', [42]);
  ck('Hello 42 World', ['Hello ', 42, ' World']);
  ck('{ foo: 42 }', [{ foo: 42 }]);
  ck('{ foo: [ 1, 2, 3, 4 ] }', [{ foo: [1, 2, 3, 4] }]);

  class Foo {}
  const f = new Foo();
  f.bar = 42;
  ck('{ foo: Foo { bar: 42 } }', [{ foo: f }]);

  // Deals with invalid messages
  assertLogs(logger, () => {
    ck('true', true);
    ck('null', null);
    ck('hello', 'hello');
    ck('{ bar: 42 }', { bar: 42 });
  }, [
    {
      invalidMessage: true,
      level: 'warn',
      message: 'serializeMessage takes an array or undefined as message. Not Boolean!',
    }, {
      invalidMessage: null,
      level: 'warn',
      message: 'serializeMessage takes an array or undefined as message. Not null!',
    }, {
      invalidMessage: 'hello',
      level: 'warn',
      message: 'serializeMessage takes an array or undefined as message. Not String!',
    }, {
      invalidMessage: { bar: 42 },
      level: 'warn',
      message: 'serializeMessage takes an array or undefined as message. Not Object!',
    },
  ]);
});

it('messageFormatSimple', () => {
  const ck = (fields, exp) => ckEq(messageFormatSimple(makeLogMessage(fields)), exp);
  ck(
    { message: ['Hello ', { foo: 42 }, ' World'] },
    '[INFO] Hello { foo: 42 } World',
  );
  ck(
    { message: ['Hello ', { foo: 42 }, ' World'], level: 'error', bar: 23 },
    '[ERROR] Hello { foo: 42 } World { bar: 23 }',
  );
});

it('messageFormatTechnical', () => {
  const ck = (fields, exp) => {
    const t = new BigDate();
    const msg = makeLogMessage(fields);

    // Discard the time (because it's hard to test for that)
    const ser = messageFormatTechnical(msg);
    const [_a, level, date, txt] = ser.match(/^\[(\S+) (\S+ \S+ \S+)\] (.*)/) || [];

    ckEq(level, msg.level.toUpperCase());
    ckEq(txt, exp);
    assert(new BigDate(date).preciseTime()
      .minus(t.preciseTime())
      .lt(1.0));
  };
  ck(
    { message: ['Hello ', { foo: 42 }, ' World'] },
    'Hello { foo: 42 } World',
  );
  ck(
    { message: ['Hello ', { foo: 42 }, ' World'], level: 'error', bar: 23 },
    'Hello { foo: 42 } World { bar: 23 }',
  );
});

it('messageFormatConsole', () => {
  const ck = (level, expect) => ckEq(
    messageFormatConsole(makeLogMessage({
      level,
      message: ['Hello ', 42, ' World'],
      foo: 'asd',
    })),
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

it('messageFormatJson, messageFormatJsonString', () => {
  const ck = (fields, expect) => {
    const msg = makeLogMessage(fields);
    const j = messageFormatJson(msg);
    const js = JSON.parse(messageFormatJsonString(msg));
    for (const gen of [j, js]) {
      delete gen.timestamp;
      ckEq(gen, expect);
    }
  };

  ck({
    message: ['Foo ', { bar: 42 }, ' Baz'],
    gerbil: true,
  }, {
    message: 'Foo { bar: 42 } Baz',
    gerbil: true,
    level: 'info',
  });
});

it('makeLogMessage', () => {
  exec(() => {
    const { timestamp, ...fields } = makeLogMessage();
    assert(timestamp instanceof Date);
    ckEq(fields, { level: 'info' });
  });

  exec(() => {
    const { timestamp, ...fields } = makeLogMessage({ foo: 23 });
    assert(timestamp instanceof Date);
    ckEq(fields, { level: 'info', foo: 23 });
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
    return join(this._buf, '');
  }
}

const testLogger = (T, hasFormatter, args, opts, recordLogs) => {
  it('sets default options', () => {
    const a = new T(...args, opts);
    assert(type(a.filter) === Function);
    assert(type(a.level) === String);
    if (hasFormatter) {
      assert(type(a.formatter) === Function);
    }
  });

  it('supports filter & level options', () => {
    const f = () => {};
    const b = new T(...args, { ...opts, filter: f, level: 'verbose' });
    ckEq(b.filter, f);
    ckEq(b.level, 'verbose');
  });

  if (hasFormatter) {
    it('supports formatter option', () => {
      const f = () => {};
      const b = new T(...args, { ...opts, formatter: f });
      ckEq(b.formatter, f);
    });
  }

  it('throws on unknown option', () => {
    ckThrows(Error, () => new T(...args, { ...opts, 'cf70e947-41d1-43db-b398-434133b0a224': 42 }));
  });

  const logger = new T(...args, opts);
  const rootLogger = createDefaultLogger();
  rootLogger.loggers.test = logger;

  const iff = new SimpleInterface({ logger });

  if (hasFormatter) {
    logger.formatter = messageFormatJsonString;
  }

  const recordJsonLogs = (fn) => pipe(
    recordLogs(logger, fn),
    map(JSON.parse),
    map(({ timestamp: _, ...fields }) => fields),
    list,
  );

  const ckStrLogs = (fn, expect) => ckEq(recordLogs(logger, fn), expect);
  const ckJsonLogs = (fn, expect) => ckEq(recordJsonLogs(fn), expect);

  it('Logs data', () => {
    ckJsonLogs(() => {
      iff.warn('Hello World');
      iff.infoFields('Foo', { bar: 42 });
    }, [
      { level: 'warn', message: 'Hello World' },
      { level: 'info', message: 'Foo', bar: 42 },
    ]);
  });

  if (hasFormatter) {
    it('Logs with messageFormatSimple', () => {
      ckStrLogs(() => {
        try {
          logger.formatter = messageFormatSimple;
          iff.error('Hello World');
          iff.fatalFields('Foo', { bar: 42 });
        } finally {
          logger.formatter = messageFormatJsonString;
        }
        // NOTE: readAllLogs must be sync and used immediately here
      }, [
        '[ERROR] Hello World',
        '[FATAL] Foo { bar: 42 }',
      ]);
    });
  }

  it('Logs with filter', () => {
    ckJsonLogs(() => {
      try {
        logger.filter = (fields) => ({ ...fields, borg: 33 });
        iff.log('We are');
      } finally {
        logger.filter = identity;
      }
    }, [
      { level: 'info', message: 'We are', borg: 33 },
    ]);
  });

  it('Logs with default fields', () => {
    ckJsonLogs(() => {
      try {
        logger.defaultFields = { borg: 33 };
        iff.log('We are');
      } finally {
        logger.defaultFields = {};
      }
    }, [
      { level: 'info', message: 'We are', borg: 33 },
    ]);
  });

  it('Drops messages because of filter', () => {
    ckJsonLogs(() => {
      try {
        logger.filter = ({ keep, ...fields }) => (keep ? fields : undefined);
        iff.verbose('Hello');
        iff.verboseFields('World', { keep: true });
      } finally {
        logger.filter = identity;
      }
    }, [
      { level: 'verbose', message: 'World' },
    ]);
  });

  it('Drops messages because of log level', () => {
    ckJsonLogs(() => {
      try {
        logger.level = 'warn';
        iff.debug('Foo');
        iff.warn('Bar');
      } finally {
        logger.level = 'silly';
      }
    }, [
      { level: 'warn', message: 'Bar' },
    ]);
  });

  it('Catches & debounces errors', async () => {
    const reports = await recordAsyncLogs(rootLogger, async () => {
      try {
        logger.filter = 42; // Break the logger

        // This will trigger an error during global logging, which
        // will cause an infinite loop of error messages logged to root.
        // Our clever code should debounce these and just print a single
        // error message.
        rootLogger.loggers.set('b896fa72-ef6d-432b-9c39-b6615bdac130', logger);

        iff.debug('Hello World'); // Trigger the error

        // Give some time to print the error (potentially multiple times
        // testing debouncing)
        await new Promise((res) => setTimeout(res, 10));
      } finally {
        logger.filter = identity; // Restore things
        rootLogger.loggers.delete('b896fa72-ef6d-432b-9c39-b6615bdac130');
      }

      // Functionality should be restored and log again
      ckJsonLogs(() => {
        iff.debug('Ford Prefect');
      }, [
        { level: 'debug', message: 'Ford Prefect' },
      ]);

      // Give some time to really make sure all error messages where collected.
      await new Promise((res) => setTimeout(res, 10));
    });

    // this doesn't work anymore, since we don't use the global root logger anymore
    // in the exception handling
    ckEq(size(reports), 0);
    // ckEq(reports[0].message, ['Encountered exception while logging!']);
    // assert(reports[0].exception instanceof Error);
    // ckEq(reports[0].logger, logger);
  });
};

describe('ConsoleLogger', async () => {
  testLogger(ConsoleLogger, true, [], {}, (logger, fn) => {
    const ss = new StringStream();
    const backup = logger.stream;
    try {
      logger.stream = ss;
      fn();
    } finally {
      logger.stream = backup;
    }

    const r = ss.extract().split('\n');
    if (last(r) === '') {
      r.pop();
    }
    return r;
  });
});

describe('FileLogger', async () => {
  const tmpfile = `/tmp/helix-shared-testfile-${uuidgen()}.txt`;
  const fd = openSync(tmpfile, 'a+');

  try {
    await testLogger(FileLogger, true, [fd], {}, (_, fn) => {
      ftruncateSync(fd);
      fn();
      const r = readFileSync(tmpfile, 'utf-8').split('\n');
      if (last(r) === '') {
        r.pop();
      }
      return r;
    });
  } finally {
    // NOTE: Can't close, because it's unclear when testLogger is done
    // closeSync(fd);
    // unlinkSync(tmpfile);
  }
});

describe('MemLogger', () => {
  testLogger(MemLogger, true, [], {}, (logger, fn) => {
    // eslint-disable-next-line no-param-reassign
    logger.buf = [];
    fn();
    return logger.buf;
  });
});

describe('MultiLogger', async () => {
  const mem1 = new MemLogger({ formatter: messageFormatJsonString });
  const mem2 = new MemLogger({ formatter: messageFormatJsonString });
  testLogger(MultiLogger, false, [{ mem1, mem2 }], {}, (_, fn) => {
    const off = mem1.buf.length;
    fn();
    const r = mem1.buf.slice(off);
    return r;
  });

  it('logs to all loggers', () => {
    ckEq(mem1.buf, mem2.buf);
  });

  it('flushes sub loggers', async () => {
    const flushes = [];
    const log0 = {
      log() {},
      async flush() {
        flushes.push('log0');
      },
    };
    const log1 = {
      log() {},
      async flush() {
        flushes.push('log1');
      },
    };
    const logger = new MultiLogger({ log0, log1 });
    const iff = new SimpleInterface({ logger });
    iff.info('hello, world');
    await iff.flush();
    assert.deepStrictEqual(flushes, ['log0', 'log1']);
  });
});

describe('InterfaceBase & SimpleInterface', () => {
  it('Sets options', () => {
    const fn = () => undefined;
    const l = new SimpleInterface({ logger: null, level: 'error', filter: fn });
    ckEq(l.logger, null);
    ckEq(l.level, 'error');
    ckEq(l.filter, fn);
  });

  it('Throws on unknown options', () => {
    ckThrows(Error, () => new SimpleInterface({ blarg: 42 }));
  });

  const logger = new MemLogger({ formatter: messageFormatJsonStatic });
  const iff = new SimpleInterface({ logger });

  it('Logs', () => {
    logger.buf = [];
    iff.log();
    iff.warn('Hello World');
    iff.sillyFields('Foo', { blarg: 42 });
    iff.fatalFields({});
    ckEq(logger.buf, [
      { level: 'info', message: '' },
      { level: 'warn', message: 'Hello World' },
      { level: 'silly', message: 'Foo', blarg: 42 },
      { level: 'fatal', message: '' },
    ]);
  });

  it('Logs with default fields', () => {
    logger.buf = [];
    const sl = new SimpleInterface({ logger, defaultFields: { foo: 42, my: { data: 'abcd' } } });
    sl.log();
    sl.warn('Hello World');
    sl.sillyFields('Foo', { foo: 44, blarg: 42 });
    sl.fatalFields({ my: { status: 'ok' } });
    ckEq(logger.buf, [
      {
        foo: 42, level: 'info', message: '', my: { data: 'abcd' },
      },
      {
        foo: 42, level: 'warn', message: 'Hello World', my: { data: 'abcd' },
      },
      {
        blarg: 42, foo: 44, level: 'silly', message: 'Foo', my: { data: 'abcd' },
      },
      {
        foo: 42, level: 'fatal', message: '', my: { status: 'ok' },
      },
    ]);
  });

  it('can filter default fields', () => {
    logger.buf = [];
    const sl = new SimpleInterface({
      logger,
      defaultFields: { foo: 42 },
      filter: (f) => (f.foo === 42 ? undefined : f),
    });
    sl.info('Hello World');
    sl.infoFields('Hello, Earth', { foo: 44 });
    ckEq(logger.buf, [
      {
        foo: 44, level: 'info', message: 'Hello, Earth',
      },
    ]);
  });

  it('Creates derived logger', () => {
    logger.buf = [];
    const sl = new SimpleInterface({ logger, defaultFields: { foo: 42, bar: 'abc' } });
    const cl = deriveLogger(sl, { defaultFields: { bar: 'xyz', my: { data: 'abcd' } } });
    cl.log();
    cl.warn('Hello World');
    cl.sillyFields('Foo', { foo: 44, blarg: 42 });
    cl.fatalFields({ my: { status: 'ok' } });
    ckEq(logger.buf, [
      {
        bar: 'xyz', foo: 42, level: 'info', message: '', my: { data: 'abcd' },
      },
      {
        bar: 'xyz', foo: 42, level: 'warn', message: 'Hello World', my: { data: 'abcd' },
      },
      {
        bar: 'xyz', blarg: 42, foo: 44, level: 'silly', message: 'Foo', my: { data: 'abcd' },
      },
      {
        bar: 'xyz', foo: 42, level: 'fatal', message: '', my: { status: 'ok' },
      },
    ]);
  });

  it('fields take precendence', () => {
    logger.buf = [];
    iff.sillyFields('Foo', { message: ['Hi'], level: 'fatal' });
    ckEq(logger.buf, [
      { level: 'fatal', message: 'Hi' },
    ]);
  });

  it('supports filter', () => {
    try {
      logger.buf = [];
      iff.filter = ({ allow, ...fields }) => (allow ? { ...fields, bar: 'blergh' } : undefined);
      iff.warn('Fnord');
      iff.sillyFields('Foo', { allow: true });
    } finally {
      iff.filter = identity;
    }
    ckEq(logger.buf, [
      { level: 'silly', message: 'Foo', bar: 'blergh' },
    ]);
  });

  it('supports level', () => {
    try {
      logger.buf = [];
      iff.level = 'info';
      iff.warn('Fnord');
      iff.sillyFields('Foo', { allow: true });
    } finally {
      iff.level = 'silly';
    }
    ckEq(logger.buf, [
      { level: 'warn', message: 'Fnord' },
    ]);
  });
});
