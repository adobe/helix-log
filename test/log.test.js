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
  options: coloretteOpts,
} = require('colorette');
const {
  join, pipe, map, identity, isdef, size, exec, type, list, last,
} = require('ferrum');
const {
  numericLogLevel, serializeMessage, ConsoleLogger, rootLogger,
  recordAsyncLogs, tryInspect, warn, messageFormatJsonString,
  FileLogger, MemLogger, MultiLogger, messageFormatSimple,
  messageFormatTechnical, messageFormatConsole, messageFormatJson,
  silly, log, messageFormatJsonStatic, SimpleInterface, makeLogMessage,
  assertLogs,
} = require('../src');
const { ckEq, ckThrows } = require('./util');

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
  const logs = await recordAsyncLogs({ formatter: messageFormatSimple }, async () => {
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
    '[ERROR] Error while inspecting object for log message: Error: 42',
    '[ERROR] Error while inspecting object for log message: Error: 90',
    '[ERROR] Error while inspecting object for log message: Error: 90',
    '[ERROR] Error while inspecting object for log message: Error: 90',
    '[ERROR] Error while inspecting object for log message: Error: 90',
  ]);
});

it('serializeMessage', () => {
  const ck = (ref, ...msg) => assert.strictEqual(serializeMessage(msg), ref);
  ck('');
  ck('42', 42);
  ck('Hello 42 World', 'Hello ', 42, ' World');
  ck('{ foo: 42 }', { foo: 42 });
  ck('{ foo: [ 1, 2, 3, 4 ] }', { foo: [1, 2, 3, 4] });

  class Foo {}
  const f = new Foo();
  f.bar = 42;
  ck('{ foo: Foo { bar: 42 } }', { foo: f });
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
    const ser = messageFormatTechnical(makeLogMessage(fields));
    // Discard the time (because it's hard to test for that)
    const [_, level, msg] = ser.match(/^\[(\w*) \d{4}-\d\d-\d\d \d\d:\d\d:\d\d.\d+ [+-]\d\d:\d\d\] (.*)$/) || [];
    assert(isdef(msg) && isdef(level));
    ckEq(`[${level}] ${msg}`, exp);
  };
  ck(
    { message: ['Hello ', { foo: 42 }, ' World'] },
    '[INFO] Hello { foo: 42 } World',
  );
  ck(
    { message: ['Hello ', { foo: 42 }, ' World'], level: 'error', bar: 23 },
    '[ERROR] Hello { foo: 42 } World { bar: 23 }',
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

const recordAsyncStderr = async (fn) => {
  const ss = new StringStream();
  const stderrBackup = console._stderr;
  try {
    console._stderr = ss;
    await fn();
  } finally {
    console._stderr = stderrBackup;
  }

  const r = ss.extract().split('\n');
  if (last(r) === '') {
    r.pop();
  }
  return r;
};

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
    const reports = await recordAsyncLogs(async () => {
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

    ckEq(size(reports), 1);
    ckEq(reports[0].message, ['Encountered exception while logging!']);
    assert(reports[0].exception instanceof Error);
    ckEq(reports[0].logger, logger);
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

  it('Shields exceptions in one logger from the other', async () => {
    const mem3 = new MemLogger({ formatter: messageFormatSimple });
    const logger = new MultiLogger({ mem3 });
    const iff = new SimpleInterface({ logger });

    const reports = await recordAsyncLogs(async () => {
      try {
        // Make sure the message will need to be debounced
        rootLogger.loggers.set('393bfb2e-f197-42cf-8da3-eebde92bebde', logger);

        // Trigger the exception
        logger.loggers.set('bad', null);
        iff.info('Hello World');

        // Make sure logging to mem1 succeeded
        ckEq(mem3.buf, ['[INFO] Hello World']);

        // Give some time to print the error (potentially multiple times
        // testing debouncing)
        await new Promise((res) => setTimeout(res, 10));
      } finally {
        rootLogger.loggers.delete('393bfb2e-f197-42cf-8da3-eebde92bebde');
        logger.loggers.delete('bad');
      }

      const errMsg = mem3.buf.pop();
      assert(errMsg.startsWith('[ERROR] Encountered exception while logging'));

      // Functionality should be fully restored
      iff.debug('Ford Prefect');
      ckEq(mem3.buf, ['[INFO] Hello World', '[DEBUG] Ford Prefect']);
    });

    ckEq(size(reports), 1);
    ckEq(reports[0].message, ['Encountered exception while logging!']);
    assert(reports[0].exception instanceof Error);
    ckEq(reports[0].logger, null);
  });
});

describe('InterfaceBase & SimpleInterface', () => {
  it('Supports default options', () => {
    const l = new SimpleInterface();
    ckEq(l.logger, rootLogger);
    ckEq(l.level, 'silly');
    ckEq(l.filter, identity);
  });

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

  it('Shields exceptions', async () => {
    await recordAsyncLogs(async () => {
      try {
        logger.buf = [];
        iff.filter = null;
        iff.warn('Hello World');

        await new Promise((res) => setTimeout(res, 10));

        iff.filter = identity;
        iff.info('Foo');

        ckEq(logger.buf, [
          { level: 'info', message: 'Foo' },
        ]);
      } finally {
        iff.filter = identity;
      }
    });
  });
});

describe('global', () => {
  it('logs', () => {
    assertLogs(() => {
      warn('Hello World');
      silly('Borg');
      log.fields({ message: ['XXX'], level: 'error', picard: 'grey' });
    }, [
      { level: 'warn', message: 'Hello World' },
      { level: 'silly', message: 'Borg' },
      { level: 'error', message: 'XXX', picard: 'grey' },
    ]);
  });

  it('Shields global desparate exceptions', async () => {
    const logged = await recordAsyncStderr(async () => {
      const backup = rootLogger.loggers;
      try {
        rootLogger.loggers = 99; // Trigger the error
        warn('Hello World');
        await new Promise((res) => setTimeout(res, 10));
      } finally {
        rootLogger.loggers = backup;
      }
    });

    ckEq(logged[0], 'Utter failure logging message: Hello World{}');
    assert(logged[1].startsWith('Utter failure logging message: Encountered exception while logging!'));

    // Should be restored
    assertLogs(() => {
      warn('Hello World');
    }, [
      { level: 'warn', message: 'Hello World' },
    ]);
  });
});
