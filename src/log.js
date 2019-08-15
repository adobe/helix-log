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

/* eslint-disable no-console, no-param-reassign, no-use-before-define, consistent-return */

const { assign } = Object;
const assert = require('assert');

const { abs, floor } = Math;
const { openSync, closeSync, writeSync } = require('fs');
const { inspect } = require('util');
const {
  black, bgRed, bgYellow, bgBlackBright, bgBlueBright,
} = require('colorette');
const {
  dict, exec, isdef, each, join, empty, type, last, TraitNotImplemented,
  list, take, size, setdefault, repeat,
} = require('ferrum');
const { jsonifyForLog } = require('./serialize-json');

// This is the superset of log levels supported by console, bunyan and winston
const _loglevelMap = {
  fatal: 0,
  error: 1,
  warn: 2,
  info: 3,
  verbose: 4,
  debug: 5,
  trace: 6,
  silly: 7,
};

/**
 * This can be used to convert a string log level into it's
 * numeric equivalent. More pressing log levels have lower numbers.
 *
 * @throws {Error} If the given log level name is invalid.
 * @param {String} name Name of the log level
 * @returns {Number} The numeric log level
 */
const numericLogLevel = (name) => {
  const r = _loglevelMap[name];
  if (r === undefined) {
    throw new Error(`Not a valid log level: ${name}`);
  }
  return r;
};

/**
 * Wrapper around inspect that is extremely robust against errors
 * during inspection.
 *
 * Specifically designed to handle errors in toString() functions
 * and custom inspect functions.
 *
 * If any error is encountered a less informative string than a full
 * inspect is returned and the error is logged using `err()`.
 *
 * @param {Any} what The object to inspect
 * @param {Object} opts Options will be passed through to inspect.
 *   Note that these may be ignored if there is an error during inspect().
 */
const tryInspect = (what, opts) => {
  opts = { depth: null, breakLength: Infinity, ...opts };
  const errors = [];
  let msg;

  // This will fail if [inspect.custom]() is borked for some type in the tree
  try {
    msg = inspect(what, opts);
  } catch (e) {
    errors.push(e);
  }

  // This will still fail if the class name of some type in the tree is borked
  try {
    // Maybe error was because of custom inspect?
    msg = isdef(msg) ? msg : inspect(what, { ...opts, customInspect: false });
  } catch (e) {
    errors.push(e);
  }

  // Log that we encountered errors during inspecting after we printed
  // this
  exec(async () => {
    if (!opts.recursiveErrorHandling && errors.length > 0) {
      await new Promise((res) => setImmediate(res));
      for (const e of errors) {
        const ser = tryInspect(e, { ...opts, recursiveErrorHandling: true });
        error(`Error while inspecting object for log message: ${ser}`);
      }
    }
  });

  return isdef(msg) ? msg : '<<COULD NOT INSPECT>>';
};

/**
 * This is a useful helper function that turns a message containing
 * arbitrary objects (like you would hand to console.log) into a string.
 *
 * Leaves strings as is; uses `require('util').inspect(...)` on all other
 * types and joins the parameters using space:
 *
 * Loggers writing to raw streams or to strings usually use this, however
 * not all loggers require this; e.g. in a browser environment
 * console.warn/log/error should be used as these enable the use of the
 * visual object inspectors, at least in chrome and firefox.
 *
 * @param {any[]} msg – Parameters as you would pass them to console.log
 * @param {Object} opts – Parameters are forwarded to util.inspect().
 *   By default `{depth: null, breakLength: Infinity, colors: false}` is used.
 * @returns {string}
 */
const serializeMessage = (msg, opts) => msg.map((v) => (typeof (v) === 'string' ? v : tryInspect(v, opts))).join(' ');

/**
 * Simple message format: Serializes the message and prefixes it with
 * the log level.
 *
 * This is used by the MemLogger by default for instance, because it is relatively
 * easy to test with and contains no extra info.
 *
 * @param {any[]} msg – Parameters as you would pass them to console.log
 * @param {Object} opts – Parameters are forwarded to serializeMessage; other than that:
 *
 *   - level: one of the log levels; this parameter is required.
 */
const messageFormatSimple = (msg, opts) => {
  const { level = 'info', ...serialzeOpts } = opts || {};
  return `[${level.toUpperCase()}] ${serializeMessage(msg, serialzeOpts)}`;
};

/**
 * Message format that includes extra information; prefixes each messagej
 *
 * This is used by FileLogger and StreamLogger by default for instance because if you
 * work with many log files you need that sort of info.
 *
 * @param {any[]} msg – Parameters as you would pass them to console.log
 * @param {Object} opts – Parameters are forwarded to serializeMessage; other than that:
 *
 *   - level: one of the log levels; this parameter is required.
 */
const messageFormatTechnical = (msg, opts) => {
  const { level = 'info', ...serialzeOpts } = opts || {};
  const digit = (v, n) => {
    const num = String(v);
    const pref = join(take(repeat('0'), n - size(num)), '');
    return pref + num;
  };
  const d = new Date();
  const tz = d.getTimezoneOffset();
  const pref = [ // [LEVEL YYYY-MM-DD hh:mm:ss.millis +tzh:tzm]
    level.toUpperCase(),
    `${d.getFullYear()}-${digit(d.getMonth(), 2)}-${digit(d.getDay(), 2)}`,
    `${digit(d.getHours(), 2)}:${digit(d.getMinutes(), 2)}:${digit(d.getSeconds(), 2)}.${digit(d.getMilliseconds(), 3)}`,
    `${tz > 0 ? '+' : '-'}${digit(abs(floor(tz / 60)), 2)}:${digit(abs(tz % 60), 2)}`,
  ];
  return `[${join(pref, ' ')}] ${serializeMessage(msg, serialzeOpts)}`;
};

/**
 * Message format with coloring/formatting escape codes
 *
 * Designed for use in terminals.
 *
 * @param {any[]} msg – Parameters as you would pass them to console.log
 * @param {Object} opts – Parameters are forwarded to serializeMessage; other than that:
 *
 *   - level: one of the log levels; this parameter is required.
 */
const messageFormatConsole = (msg, opts) => {
  const { level = 'info', ...serialzeOpts } = opts || {};

  const ser = serializeMessage(msg, { colors: true, ...serialzeOpts });
  const pref = `[${level.toUpperCase()}]`;

  if (level === 'info') {
    return ser;
  } else if (level === 'fatal') {
    return bgRed(black(`${pref} ${ser}`));
  }

  const cols = {
    error: bgRed,
    warn: bgYellow,
    verbose: bgBlueBright,
  };
  const bgColor = cols[level];
  if (bgColor) {
    return `${bgColor(black(pref))} ${ser}`;
  }

  return `${bgBlackBright(pref)} ${ser}`;
};

/**
 * Message format that produces json.
 *
 * Designed for structured logging; e.g. Loggly.
 *
 * This produces an object that can be converted to JSON. It does not
 * produce a string, but you can easily write an adapter like so:
 *
 * ```
 * const messageFormatJsonString = (...args) =>
 *    JSON.stringify(messageFormatJson(...args));
 * ```
 *
 * You can also wrap this to provide extra default fields:
 *
 * ```
 * const messageFormatMyJson = (...args) => {
 *    pid: process.pid,
 *    ...JSON.stringify(messageFormatJson(...args)),
 * }
 * ```
 *
 * If the last element in the message can be converted to json-like using
 * jsonifyForLog, then all the resulting fields will be included in the json-like
 * object generated.
 *
 * The field `message` is reserved. The fields `level` and `timestamp` are filled with
 * default values.
 *
 * If the last object is an exception, it will be sent as { exception: $exception };
 * this serves to facilitate searching for exceptions explicitly.
 *
 * @param {any[]} msg – Parameters as you would pass them to console.log
 * @param {Object} opts – Parameters are forwarded to serializeMessage; other than that:
 *
 *   - level: one of the log levels; this parameter is required.
 */
const messageFormatJson = (msg, opts) => {
  const { level = 'info', ...serialzeOpts } = opts || {};

  let data = {};

  const setReserved = (name, val) => {
    if (name in data) {
      error("Can't log the", name, 'field using the json formatter. It is a reserved field!');
    }
    data[name] = val;
  };

  // Try encoding the last item as json; provided there is a last
  // item; it is not a string and it can be encoded as json.
  if (!empty(msg) && type(last(msg)) !== String) {
    let lst = last(msg);

    // Exceptions are encoded as the exception field in json
    if (lst instanceof Error) {
      lst = { exception: lst };
    }

    // Try json encoding the field; if this is supported
    try {
      lst = jsonifyForLog(lst);
    } catch (er) {
      lst = undefined;
      if (!(er instanceof TraitNotImplemented)) {
        throw er;
      }
    }

    // Was successful
    if (type(lst) === Object) {
      data = lst;
      msg = list(take(msg, size(msg) - 1));
    }
  }

  setdefault(data, 'timestamp', new Date());
  setdefault(data, 'level', level);

  if (!empty(msg)) {
    setReserved('message', serializeMessage(msg, serialzeOpts));
  }

  return data;
};

/**
 *
 * Uses a fairly simple interface to avoid complexity for use cases in
 * which is not required. Can be used to dispatch logging to more
 * elaborate libraries. E.g. a logger using winston could be constructed like this:
 *
 * @interface Logger
 */

/**
 * Actually print a log message
 *
 * Implementations of this MUST NOT throw exceptions. Instead implementors
 * ARE ADVISED to attempt to log the error using err() while employing some
 * means to avoid recursively triggering the error. Loggers SHOULD fall back
 * to logging with console.error.
 *
 * Even though loggers MUST NOT throw exceptions; users of this method SHOULD
 * still catch any errors and handle them appropriately.
 *
 * @method
 * @name log
 * @param {any[]} msg The message; list of arguments as you would pass it to console.log
 * @param {Object} opts – Configuration object; contains only one key at
 *   the moment: `level` - The log level which can be one of `error, warn,
 *   info, verbose` and `debug`.
 */

/**
 * Logger that is especially designed to be used in node.js
 * Print's to stderr; Marks errors, warns & debug messages
 * with a colored `[ERROR]`/... prefix. Uses `inspect` to display
 * all non-strings.
 *
 * @implements Logger
 * @class
 * @param {Object} opts – Configuration object
 *
 *   - `level`: Default `info`; The minimum log level to sent to loggly
 *   - `formatter`: Default `messageFormatConsole`; A formatter producing strings
 *
 *   All other options are forwarded to the formatter.
 */
class ConsoleLogger {
  /**
   * The minimum log level for messages to be printed.
   * Feel free to change to one of the available levels.
   * @member {string} level
   */

  /**
   * Formatter used to format all the messages.
   * Must yield an object suitable for passing to JSON.serialize
   * Feel free to mutate or exchange.
   * @member {Function} formatter
   */

  /**
   * Options that will be passed to the formatter;
   * Feel free to mutate or exchange.
   * @member {object} fmtOpts
   */

  constructor(opts = {}) {
    const { level = 'info', formatter = messageFormatConsole, ...fmtOpts } = opts;
    assign(this, { level, formatter, fmtOpts });
  }

  log(msg, opts = {}) {
    // Defensive coding: Putting the entire function in try-catch
    // clauses to avoid any sorts of exceptions leaking
    const { level = 'info' } = opts || {};
    if (numericLogLevel(level) <= numericLogLevel(this.level)) {
      // Logs should go to stderr; this is only correct in node;
      // in the browser we should use console.log
      console.error(this.formatter(msg, { ...this.fmtOpts, level }));
    }
  }
}

/**
 * Simple logger that forwards all messages to the underlying loggers.
 *
 * This maintains an es6 map called loggers. Consumers of this API are
 * explicitly permitted to mutate this map or replace it all together in
 * order to add, remove or alter logger.
 *
 * ```js
 * const { rootLogger } = require('@adobe/helix-shared').log;
 *
 * // Changing the log level of the default logger:
 * rootLogger.loggers.get('default').level = 'info';
 *
 * // Adding a named logger
 * rootLogger.loggers.set('logfile', new FileLogger('...'));
 *
 * // Adding an anonymous logger (you can add an arbitrary number of these)
 * const name = `logfile-${uuidgen()}`;
 * rootLogger.loggers.set(name, new FileLogger('...'));
 *
 * // Deleting a logger
 * rootLogger.loggers.delete(name);
 *
 * // Replacing all loggers
 * rootLogger.loggers = new Map([['default', new ConsoleLogger({level: 'debug'})]]);
 * ```
 *
 * @implements Logger
 * @class
 * @parameter {...Logger} ...loggers – The loggers to forward to.
 */
class MultiLogger {
  /*
   * The list of loggers this is forwarding to. Feel free to mutate
   * or replace.
   *
   * @member {Map<Logger>} loggers
   */

  constructor(loggers) {
    this.loggers = dict(loggers);
  }

  log(msg, opts = undefined) {
    each(this.loggers, async ([name, sub]) => {
      // We wrap each logging in separate try/catch blocks so exceptions
      // on one logger are isolated from jumping over to other loggers
      try {
        await sub.log(msg, opts);
      } catch (err) {
        const metaErr = 'MultiLogger encountered exception while logging to';
        // This prevents recursively triggering errors again and again
        if (msg[0] !== metaErr) {
          // Try actually logging the message before printing the errors
          // at least for loggers that are not async
          await new Promise((res) => setImmediate(res));
          // Defensive coding: Not printing the message here because the message
          // may have triggered the exception…
          error(metaErr, name, '-', sub, ': ', err);
        }
      }
    });
  }
}

/**
 * Logs to any writable node.js stream
 *
 * @class
 * @implements Logger
 * @param {WritableStream} stream - The stream to log to
 * @param {Object} opts – Configuration object
 *
 *   - `level`: Default `info`; The minimum log level to sent to loggly
 *   - `formatter`: Default `messageFormatTechinal`; A formatter producing strings
 *
 *   All other options are forwarded to the formatter.
 */
class StreamLogger {
  /**
   * The stream this logs to.
   * @member {Object} stream
   */

  /**
   * The minimum log level for messages to be printed.
   * Feel free to change to one of the available levels.
   * @member {string} level
   */

  /**
   * Formatter used to format all the messages.
   * Must yield an object suitable for passing to JSON.serialize
   * Feel free to mutate or exchange.
   * @member {Function} formatter
   */

  /**
   * Options that will be passed to the formatter;
   * Feel free to mutate or exchange.
   * @member {object} fmtOpts
   */

  constructor(stream, opts = {}) {
    const { level = 'info', formatter = messageFormatTechnical, ...fmtOpts } = opts;
    assign(this, {
      stream, level, formatter, fmtOpts,
    });
  }

  log(msg, opts = {}) {
    const { level = 'info' } = opts || {};
    if (numericLogLevel(level) > numericLogLevel(this.level)) {
      return;
    }

    this.stream.write(this.formatter(msg, { ...this.fmtOpts, level }));
    this.stream.write('\n');
  }
}

/**
 * Logger specifically designed for logging to unix file descriptors.
 *
 * This logger is synchronous: It uses blocking syscalls and thus guarantees
 * that all data is written even if process.exit() is called immediately after
 * logging.
 * For normal files this is not a problem as linux will never block when writing
 * to files, for sockets, pipes and ttys this might block the process for a considerable
 * time. If this poses a problem, consider using StreamLogger instead:
 *
 * ```
 * new StreamLogger(fs.createWriteStream('/my/file'))
 * ```
 *
 * or
 *
 * ```
 * new StreamLogger(fs.createWriteStream(null, { fd: myFd }));
 * ```
 *
 * @class
 * @extends StreamLogger
 * @implements Logger
 * @param {String|Integer} name - The path of the file to log to
 *   OR the unix file descriptor to log to.
 * @param {Object} opts – Configuration object
 *
 *   - `level`: Default `info`; The minimum log level to sent to loggly
 *   - `formatter`: Default `messageFormatTechnical`; A formatter producing strings
 *
 *   All other options are forwarded to the formatter.
 */
class FileLogger {
  /**
   * The underlying operating system file descriptor.
   * @member {Integer} fd
   */

  /**
   * The minimum log level for messages to be printed.
   * Feel free to change to one of the available levels.
   * @member {string} level
   */

  /**
   * Formatter used to format all the messages.
   * Must yield an object suitable for passing to JSON.serialize
   * Feel free to mutate or exchange.
   * @member {Function} formatter
   */

  /**
   * Options that will be passed to the formatter;
   * Feel free to mutate or exchange.
   * @member {object} fmtOpts
   */

  constructor(name, opts = {}) {
    const { level = 'info', formatter = messageFormatTechnical, ...fmtOpts } = opts;
    const fd = type(name) === Number ? name : openSync(name, 'a');
    assign(this, {
      fd, level, formatter, fmtOpts,
    });
  }

  log(msg, opts = {}) {
    const { level = 'info' } = opts || {};
    if (numericLogLevel(level) > numericLogLevel(this.level)) {
      return;
    }

    writeSync(this.fd, `${this.formatter(msg, { ...this.fmtOpts, level })}\n`);
  }

  close() {
    closeSync(this.fd);
  }
}
/**
 * Logs messages to an in-memory buffer.
 *
 * @class
 * @implements Logger
 * @class
 * @param {Object} opts – Configuration object
 *
 *   - `level`: Default `info`; The minimum log level to sent to loggly
 *   - `formatter`: Default `messageFormatSimple`; A formatter producing any format.
 *
 *   All other options are forwarded to the formatter.
 */
class MemLogger {
  /**
   * The buffer that stores all separate, formatted log messages.
   * @member {Array} buf
   */

  /**
   * The minimum log level for messages to be printed.
   * Feel free to change to one of the available levelsformatter
   * @member {string} level
   */

  /**
   * Formatter used to format all the messages.
   * Must yield an object suitable for passing to JSON.serialize
   * Feel free to mutate or exchange.
   * @member {Function} formatter
   */

  /**
   * Options that will be passed to the formatter;
   * Feel free to mutate or exchange.
   * @member {object} fmtOpts
   */

  constructor(opts = {}) {
    const { level = 'info', formatter = messageFormatSimple, ...fmtOpts } = opts;
    assign(this, {
      level, formatter, fmtOpts, buf: [],
    });
  }

  log(msg, opts = {}) {
    const { level = 'info' } = opts || {};
    if (numericLogLevel(level) <= numericLogLevel(this.level)) {
      this.buf.push(this.formatter(msg, { ...this.fmtOpts, level }));
    }
  }
}

/**
 * The logger all other loggers attach to.
 *
 * Must always contain a logger named 'default'; it is very much reccomended
 * that the default logger always be a console logger; this can serve as a good
 * fallback in case other loggers fail.
 *
 * ```js
 * // Change the default logger
 * rootLogger.loggers.set('default', new ConsoleLogger({level: 'debug'}));
 * ```
 *
 * You should not log to the root logger directly; instead use one of the
 * wrapper functions `log, fatal, err, warn, info, verbose, debug`; they
 * perform some additional
 *
 * @const
 */
const rootLogger = new MultiLogger({
  default: new ConsoleLogger({ level: 'info' }),
});

/**
 * Lot to the root logger; this is a wrapper around `rootLogger.log`
 * that handles exceptions thrown by rootLogger.log.
 *
 * @function
 * @param {Any[]} msg – The message as you would hand it to console.log
 * @param {Object} opts – Any options you would pass to rootLogger.log
 */
const log = (msg, opts) => {
  try {
    rootLogger.log(msg, opts);
  } catch (er) {
    console.error('Failed to log message:', ...msg);
    console.error('Cause:', er);
  }
};

/**
 * Uses the currently installed logger to print a fatal error-message
 * @function
 * @param {...Any} ...msg – The message as you would hand it to console.log
 */
const fatal = (...msg) => log(msg, { level: 'fatal' });

/**
 * Uses the currently installed logger to print an error-message
 * @function
 * @param {...Any} ...msg – The message as you would hand it to console.log
 */
const error = (...msg) => log(msg, { level: 'error' });

/**
 * Uses the currently installed logger to print an warn
 * @function
 * @param {...Any} ...msg – The message as you would hand it to console.log
 */
const warn = (...msg) => log(msg, { level: 'warn' });

/**
 * Uses the currently installed logger to print an informational message
 * @function
 * @param {...Any} ...msg – The message as you would hand it to console.log
 */
const info = (...msg) => log(msg, { level: 'info' }, ...msg);

/**
 * Uses the currently installed logger to print a verbose message
 * @function
 * @param {...Any} ...msg – The message as you would hand it to console.log
 */
const verbose = (...msg) => log(msg, { level: 'verbose' }, ...msg);

/**
 * Uses the currently installed logger to print a message intended for debugging
 * @function
 * @param {...Any} ...msg – The message as you would hand it to console.log
 */
const debug = (...msg) => log(msg, { level: 'debug' });

/**
 * Uses the currently installed logger to print a trace level message
 * @function
 * @param {...Any} ...msg – The message as you would hand it to console.log
 */
const trace = (...msg) => log(msg, { level: 'trace' }, ...msg);

/**
 * Uses the currently installed logger to print a silly level message
 * @function
 * @param {...Any} ...msg – The message as you would hand it to console.log
 */
const silly = (...msg) => log(msg, { level: 'silly' }, ...msg);

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
r
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
    return assertAsyncLogs({}, opts, fn);
  } else {
    assert.strictEqual(await recordAsyncLogs(opts, fn), logs);
  }
};

module.exports = {
  numericLogLevel,
  serializeMessage,
  messageFormatSimple,
  messageFormatTechnical,
  messageFormatConsole,
  messageFormatJson,
  ConsoleLogger,
  MultiLogger,
  StreamLogger,
  FileLogger,
  MemLogger,
  rootLogger,
  log,
  fatal,
  error,
  info,
  warn,
  verbose,
  debug,
  trace,
  silly,
  recordLogs,
  assertLogs,
  recordAsyncLogs,
  assertAsyncLogs,
  tryInspect,
};
