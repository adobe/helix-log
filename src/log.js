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

/* eslint-disable no-console, no-param-reassign, no-use-before-define */
/* eslint-disable consistent-return, lines-between-class-members, implicit-arrow-linebreak */

const { assign } = Object;
const { inspect } = require('util');
const {
  black, bgRed, bgYellow, bgBlackBright, bgBlueBright,
} = require('colorette');
const {
  dict, exec, isdef, each, join, type, list, identity,
  intersperse, typename, empty, eq, pipe, map,
} = require('ferrum');
const { openSync, closeSync, writeSync } = require('fs');
const { BigDate } = require('./big-date');
const { jsonifyForLog } = require('./serialize-json');

// This is the superset of log levels supported by console, bunyan and winston
const __loglevelMap = {
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
 * @param {string} name Name of the log level
 * @returns {number} The numeric log level
 */
const numericLogLevel = (name) => {
  const r = __loglevelMap[name];
  /* istanbul ignore next */
  if (r === undefined) {
    throw new Error(`Not a valid log level: ${name}`);
  }
  return r;
};

numericLogLevel.__loglevelMap = __loglevelMap;

/**
 * Internally helix log passe these messages around.
 *
 * Messages are just plain objects with some conventions
 * regarding their fields:
 *
 * @example
 * ```
 * const myMessage = {
 *   // REQUIRED
 *
 *   level: 'info',
 *   timestamp: new BigDate(), // Can also be a normal Date
 *
 *   // OPTIONAL
 *
 *   // This is what constitutes the actual log message an array
 *   // of any js objects which are usually later converted to text
 *   // using `tryInspect()`; we defer this text conversion step so
 *   // formatters can do more fancy operations (like colorizing certain
 *   // types; or we could)
 *   message: ['Print ', 42, ' deep thoughts!']
 *   exception: {
 *
 *     // REQUIRED
 *     $type: 'MyCustomException',
 *     name; 'MyCustomException',
 *     message: 'Some custom exception ocurred',
 *     stack: '...',
 *
 *     // OPTIONAL
 *     code: 42,
 *     causedBy: <nested exception>
 *
 *     // EXCEPTION MAY CONTAIN ARBITRARY OTHER FIELDS
 *     ...fields,
 *   }
 *
 *   // MESSAGE MAY CONTAIN ARBITRARY OTHER FIELDS
 *   ...fields,
 * }
 * ```
 *
 * @interface Message
 */

/**
 * Supplies default values for all the required fields in log messages.
 *
 * You may pass this a message that is just a string (as opposed to the
 * usually required array of message components). The message will then automatically
 * be wrapped in an array.
 *
 * @function
 * @param {Object} [fields={}] User supplied field values; can overwrite
 *   any default values
 * @returns {Message}
 */
const makeLogMessage = (fields = {}) => {
  const r = {
    level: 'info',
    timestamp: new BigDate(),
    ...fields,
  };
  if ('message' in r) {
    r.message = type(r.message) === Array ? r.message : [r.message];
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
 * @function
 * @param {*} what The object to inspect
 * @param {Object} opts Options will be passed through to inspect.
 *   Note that these may be ignored if there is an error during inspect().
 */
const tryInspect = (what, opts = {}) => {
  const opts_ = {
    depth: null, breakLength: Infinity, logger: null, ...opts,
  };
  const { logger } = opts_;
  delete opts_.logger;
  const errors = [];
  let msg;

  // This will fail if [inspect.custom]() is borked for some type in the tree
  try {
    msg = inspect(what, opts_);
  } catch (e) {
    errors.push(e);
  }

  // This will still fail if the class name of some type in the tree is borked
  try {
    // Maybe error was because of custom inspect?
    msg = isdef(msg) ? msg : inspect(what, { ...opts_, customInspect: false });
  } catch (e) {
    errors.push(e);
  }

  // Log that we encountered errors during inspecting after we printed
  // this
  exec(async () => {
    if (!opts_.recursiveErrorHandling && errors.length > 0) {
      await new Promise((res) => {
        setImmediate(res);
      });
      for (const e of errors) {
        const ser = tryInspect(e, { ...opts_, logger, recursiveErrorHandling: true });
        if (logger) {
          logger.log({ level: 'error', message: [`Error while inspecting object for log message: ${ser}`] });
        } else {
          console.error(`Error while inspecting object for log message: ${ser}`);
        }
      }
    }
  });

  return isdef(msg) ? msg : '<<COULD NOT INSPECT>>';
};

/**
 * Turns the message field into a string.
 *
 * @function
 * @param {Array<*>|undefined} msg – Message components to serialize
 * @param {Object} opts – Parameters are forwarded to tryInspect()
 * @returns {string}
 */
const serializeMessage = (msg, opts = {}) => {
  if (msg === undefined) { // No message at all (which is OK!)
    return '';
  } else if (type(msg) === Array) { // Message is an array (as is proper)
    return pipe(
      msg,
      map((v) => (type(v) === String ? v : tryInspect(v, opts))),
      join(''),
    );
  } else {
    const { logger } = opts;

    // These are technically invalid, we still handle them gracefully and
    // emit a warning.
    if (logger) {
      logger.log({ level: 'warn', message: [`serializeMessage takes an array or undefined as message. Not ${typename(type(msg))}!`], invalidMessage: msg });
    } else {
      console.warn(`serializeMessage takes an array or undefined as message. Not ${typename(type(msg))}!`, msg);
    }

    return type(msg) === String ? msg : tryInspect(msg, opts);
  }
};
/**
 * Most loggers take a message with `log()`, encode it and write it to some
 * external resource.
 *
 * E.g. most Loggers (like ConsoleLogger, FileLogger, ...) write to a text
 * oriented resource, so the message needs to be converted to text. This is
 * what the formatter is for.
 *
 * Not all Loggers require text; some are field oriented (working with json
 * compatible data), others like the MemLogger can handle arbitrary javascript
 * objects, but still provide an optional formatter (in this case defaulted to
 * the identity function – doing nothing) in case the user explicitly wishes
 * to perform formatting.
 *
 * @callback MessageFormatter
 * @param {Message} fields
 * @returns {*} Whatever kind of type the Logger needs. Usually a string.
 */

/**
 * Simple message format: Serializes the message and prefixes it with
 * the log level.
 *
 * This is used by the MemLogger by default for instance, because it is relatively
 * easy to test with and contains no extra info.
 *
 * @function
 * @type MessageFormatter
 * @param {Message} fields
 * @return {string}
 */
const messageFormatSimple = (fields, opts) => {
  // eslint-disable-next-line
  const { level, timestamp, message, ...rest } = fields;
  const full = empty(rest) ? message : [...message, ' ', rest];
  return `[${level.toUpperCase()}] ${serializeMessage(full, opts)}`;
};

/**
 * Message format that includes extra information; prefixes each message
 * with the time stamp and the log level.
 *
 * This is used by FileLogger by default for instance because if you
 * work with many log files you need that sort of info.
 *
 * @function
 * @type MessageFormatter
 * @param {Message} fields
 * @returns {string}
 */
const messageFormatTechnical = (fields, opts) => {
  const {
    level, timestamp, message, ...rest
  } = fields;

  // Timestamp with extra spaces
  const ts = timestamp.toISOString().replace(/T|(?=Z)|(?=[+-]\d+$)/g, ' ');
  const pref = [level.toUpperCase(), ts];

  const fullMsg = empty(rest) ? message : [...message, ' ', rest];
  return `[${join(pref, ' ')}] ${serializeMessage(fullMsg, opts)}`;
};

/**
 * Message format with coloring/formatting escape codes
 *
 * Designed for use in terminals.
 *
 * @function
 * @type MessageFormatter
 * @param {Message} fields
 * @returns {string}
 */
const messageFormatConsole = (fields, opts) => {
  // eslint-disable-next-line
  const { level, timestamp, message, ...rest } = fields;
  const fullMsg = empty(rest) ? message : [...message, ' ', rest];
  const ser = serializeMessage(fullMsg, { colors: true, ...opts });
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
 * Use jsonifyForLog to turn the fields into something that
 * can be converted to json.
 *
 * @function
 * @type MessageFormatter
 * @oaram {Message} message the log message
 * @param {*} fields additional log fields
 * @returns {Object}
 */
const messageFormatJson = ({ message, ...fields }, opts) => jsonifyForLog({
  message: serializeMessage(message, opts),
  ...fields,
});

/**
 * Message format that produces & serialize json.
 *
 * Really just an alias for `JSON.stringify(messageFormatJson(fields))`.
 *
 * @function
 * @type MessageFormatter
 * @param {Message} fields
 * @returns {Object}
 */
const messageFormatJsonString = (fields) => JSON.stringify(messageFormatJson(fields));

/**
 * Helper function that creates a derived logger that is derived from a given logger, merging
 * the given options. All the properties are shallow copied to the new logger With the exception of
 * the `defaultFields`, where the `defaultFields` object itself is shallow-copied. Thus allowing to
 * _extend_ the default fields.
 *
 * @param {Logger} logger the logger to derive from.
 * @param {object} opts Options to merge with this logger
 * @returns {Logger} A new logger with updated options.
 */
const deriveLogger = (logger, opts) => {
  const { defaultFields: optFields = {}, ...rest } = opts;
  const defaultFields = { ...logger.defaultFields, ...optFields };
  return new logger.constructor({ ...logger, defaultFields, ...rest });
};

/**
 * Helper to wrap any block of code and handle it's async & sync exceptions.
 *
 * This will catch any exceptions/promise rejections and log them using the rootLogger.
 *
 * @function
 * @package
 * @param {Object} fields Fields to set in any error message (usually indicates which logger
 *   was used)
 * @param {Logger} logger the logger to wrap
 * @param {Function} code The code to wrap
 * @returns {Message}
 */
const __handleLoggingExceptions = (fields, logger, code) => {
  exec(async () => {
    try {
      await code();
    } catch (e) {
      const errorMsg = 'Encountered exception while logging!';
      // Debounce error messages
      if (!fields.message || !eq(fields.message, [errorMsg])) {
        // Defer logging the error (useful with multi logger so all messages
        // are logged before the errors are logged)
        await new Promise((res) => {
          setImmediate(res);
        });
        logger.log({
          level: 'error',
          message: [errorMsg],
          application: 'infrastructure',
          subsystem: 'helix-log-error-handling',
          exception: e,
          logger,
        });
      }
    }
  });
};

/**
 * Loggers are used to write log message.
 *
 * These receive a message via their log() method and forward
 * the message to some external resource or other loggers in
 * the case of MultiLogger.
 *
 * Loggers MUST provide a `log(message)` method accepting log messages.
 *
 * Loggers SHOULD provide a constructor that can accept options as
 * the last argument `new MyLogger(..args, { ...options })`;
 *
 * Loggers MAY support any arguments or options in addition to the ones
 * described here.
 *
 * Loggers SHOULD NOT throw exceptions; instead they should log an error.
 *
 * Loggers MUST use the optional fields & named options described in this
 * interface either as specified here, or not at all.
 *
 * Loggers SHOULD provide a named constructor option 'level' and associated field
 * that can be used to limit logging to messages to those with a sufficiently
 * high log level.
 *
 * Loggers SHOULD provide a named constructor option 'filter' and associated field
 * that can be used to transform messages arbitrarily. This option should default to
 * the `identity()` function from ferrum. If the filter returns `undefined`
 * the message MUST be discarded.
 *
 * Loggers SHOULD provide a named constructor option 'defaultFields'; if they do support the
 * property they MUST perform a shallow merge/setdefault into the message AFTER applying the
 * filters.
 *
 * If loggers send messages to some external resource not supporting the Message
 * format, they SHOULD also provide an option 'formatter' and associated field
 * that is used to produce the external format. This formatter SHOULD be set
 * to a sane default.
 *
 * Helix-log provides some built-in formatters e.g. for plain text, json and
 * for consoles supporting ANSI escape sequences.
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
 * @memberOf Logger#
 * @name log
 * @param {Message} fields
 */

/**
 * Flush the internal buffer.
 *
 * Implementations of this SHOULD try to flush the underlying log sink if possible.
 * The returned promise SHOULD only fulfill if the flushing was done (best effort).
 *
 * Note that implementations SHOULD use best effort to avoid buffering or the need for flushing.
 * However, there might be cases where this is not possible, for example when sending log messages
 * over the network.
 *
 * @method
 * @memberOf Logger#
 * @name flush
 */

/**
 * Can be used as a base class/helper for implementing loggers.
 *
 * This will first apply the filter, drop the message if the level is
 * too low or if the filter returned undefined and will then call the
 * subclass provided this._logImpl function for final processing.
 *
 * This also wraps the entire logging logic into a promise enabled/async
 * error handler that will log any errors using the rootLogger.
 *
 * @example
 * ```
 * class MyConsoleLogger extends LoggerBase {
 *   _logImpl(fields) {
 *     console.log(fields);
 *   }
 * }
 * ```
 *
 * @class
 * @param {Object} opts – Optional, named parameters
 * @param {string} [opts.level='silly'] The minimum log level to sent to loggly
 * @param {Function} [opts.filter=identity] Will be given every log message to perform
 *   arbitrary transformations; must return either another valid message object or undefined
 *   (in which case the message will be dropped).
 */
class LoggerBase {
  /**
   * The minimum log level for messages to be printed.
   * Feel free to change to one of the available levels.
   * @memberOf LoggerBase#
   * @member {string} level
   */

  /**
   * Used to optionally transform all messages.
   * Takes a message and returns a transformed message
   * or undefined (in which case the message will be dropped).
   * @memberOf LoggerBase#
   * @member {Function} filter
   */

  constructor({
    level = 'silly', defaultFields = {}, filter = identity, ...unknown
  } = {}) {
    assign(this, { level, filter, defaultFields });
    if (!empty(unknown)) {
      throw new Error(`Unknown named options given to ${typename(type(this))}: ${tryInspect(unknown)}`);
    }
  }

  // Private: Code sharing with FormattedLoggerBase
  __logWithFormatter(fields_, formatter) {
    __handleLoggingExceptions(fields_, this, async () => {
      const fields = this.filter(fields_);
      if (fields !== undefined && numericLogLevel(fields.level) <= numericLogLevel(this.level)) {
        const mergedFields = { ...this.defaultFields, ...fields };
        if (formatter === undefined) { // LoggerBase impl
          return this._logImpl(mergedFields);
        } else { // FormattedLoggerBase impl
          return this._logImpl(this.formatter(mergedFields, { logger: this }), fields);
        }
      }
    });
  }

  log(fields) {
    return this.__logWithFormatter(fields, undefined);
  }

  // eslint-disable-next-line no-empty-function
  async flush() { }
}

/**
 * Can be used as a base class/helper for implementing loggers that
 * require a formatter.
 *
 * Will do the same processing as `LoggerBase` and in addition call
 * the formatter before invoking _logImpl.
 *
 * @example
 * ```
 * class MyConsoleLogger extends FormattedLoggerBase {
 *   _logImpl(payload, fields) {
 *     console.log(`[${fields.level}]`, payload);
 *   }
 * }
 * ```
 *
 * @class
 * @param {Function} [opts.formatter] In addition to the filter, the formatter
 *   will be used to convert the message into a format compatible with
 *   the external resource.
 */
class FormattedLoggerBase extends LoggerBase {
  /**
   * Formatter used to format all the messages.
   * Must yield an object suitable for the external resource
   * this logger writes to.
   * @memberOf FormattedLoggerBase#
   * @member {MessageFormatter} formatter
   */

  constructor({ formatter = identity, ...opts } = {}) {
    super(opts);
    assign(this, { formatter });
  }

  log(fields) {
    this.__logWithFormatter(fields, this.formatter);
  }
}

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

/**
 * Simple logger that forwards all messages to the underlying loggers.
 *
 * This maintains an es6 map called loggers. Consumers of this API are
 * explicitly permitted to mutate this map or replace it all together in
 * order to add, remove or alter logger.
 *
 * @example
 * ```js
 * const { createDefaultLogger } = require('@adobe/helix-log');
 *
 * const logger = createDefaultLogger();
 *
 * // Changing the log level of the default logger:
 * logger.loggers.get('default').level = 'info';
 *
 * // Adding a named logger
 * logger.loggers.set('logfile', new FileLogger('...'));
 *
 * // Adding an anonymous logger (you can add an arbitrary number of these)
 * const name = `logfile-${uuidgen()}`;
 * logger.loggers.set(name, new FileLogger('...'));
 *
 * // Deleting a logger
 * logger.loggers.delete(name);
 *
 * // Replacing all loggers
 * logger.loggers = new Map([['default', new ConsoleLogger({level: 'debug'})]]);
 * ```
 *
 * @implements Logger
 * @class
 * @parameter {Sequence<Loggers>} loggers – The loggers to forward to.
 */
class MultiLogger extends LoggerBase {
  /*
   * The list of loggers this is forwarding to. Feel free to mutate
   * or replace.
   *
   * @memberOf MultiLogger#
   * @member {Map<Logger>} loggers
   */

  constructor(loggers, opts = {}) {
    super(opts);
    this.loggers = dict(loggers);
  }

  async flush() {
    return Promise.all(map(this.loggers, ([_name, sub]) => sub.flush()));
  }

  _logImpl(fields) {
    each(this.loggers, ([_name, sub]) => {
      __handleLoggingExceptions(fields, sub, async () => {
        await sub.log(fields);
      });
    });
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
 * time.
 *
 * Formatter MUST produce strings. Default formatter is messageFormatTechnical.
 *
 * @class
 * @implements Logger
 * @param {string|Integer} name - The path of the file to log to
 *   OR the unix file descriptor to log to.
 */
class FileLogger extends FormattedLoggerBase {
  /**
   * The underlying operating system file descriptor.
   * @memberOf FileLogger#
   * @member {Integer} fd
   */

  constructor(name, opts = {}) {
    super({ formatter: messageFormatTechnical, ...opts });
    const fd = type(name) === Number ? name : openSync(name, 'a');
    assign(this, { fd });
  }

  _logImpl(str) {
    writeSync(this.fd, `${str}\n`);
  }

  /* istanbul ignore next */
  close() {
    closeSync(this.fd);
  }
}

/**
 * Logs messages to an in-memory buffer.
 *
 * Formatter can be anything; default just logs the messages as-is.
 *
 * @class
 * @implements Logger
 */
class MemLogger extends FormattedLoggerBase {
  /**
   * An array that holds all the messages logged thus far.
   * May be modified An array that holds all the messages logged thus far.
   * May be modified.
   * @memberOf MemLogger#
   * @member {Array} buf
   */

  constructor(opts = {}) {
    super(opts);
    assign(this, { buf: [] });
  }

  _logImpl(payload) {
    this.buf.push(payload);
  }
}

/**
 * Helix-Log LoggingInterfaces take messages as defined by some external interface,
 * convert them to the internal Message format and forward them to a logger.
 *
 * Some use cases include:
 *
 * - Providing a Console.log/warn/error compatible interface
 * - Providing winston or bunyan compatible logging API
 * - Providing a backend for forwarding bunyan or winston logs to helix log
 * - Receiving log messages over HTTP
 * - SimpleInterface and SimpleInterface are used to provide the
 *   `info("My", "Message")` and `info.fields("My", "Message", { cutsom: "fields" })`
 *   interfaces.
 *
 * LoggingInterfaces SHOULD provide a constructor that can accept options as
 * the last argument `new MyInterface(..args, { ...options })`;
 *
 * LoggingInterfaces MAY support any arguments or options in addition to the ones
 * described here.a
 *
 * LoggingInterfaces MUST use the optional fields & named options described in this
 * LoggingInterface either as specified here, or not at all.
 *
 * LoggingInterfaces SHOULD NOT throw exceptions; instead they should log errors using
 * the global logger.
 *
 * LoggingInterfaces SHOULD provide a named constructor option/field 'logger' that indicates
 * which destination logs are sent to. This option SHOULD default to the rootLogger.
 *
 * LoggingInterfaces SHOULD provide a named constructor option 'level' and associated field
 * that can be used to limit logging to messages to those with a sufficiently
 * high log level.
 *
 * LoggingInterfaces SHOULD provide a named constructor option 'filter' and associated field
 * that can be used to transform messages arbitrarily. This option should default to
 * the `identity()` function from ferrum. If the filter returns `undefined`
 * the message MUST be discarded.
 *
 * LoggingInterfaces SHOULD provide a named constructor option 'defaultFields'; if they do support
 * the property they MUST perform a shallow merge/setdefault into the message AFTER applying the
 * filters.
 *
 * @interface LoggingInterface
 */

/**
 * Can be used as a base class/helper for implementing logging interfaces.
 *
 * This will make sure that all the required fields are set to their
 * default value, apply the filter, drop the message if the level is
 * too low or if the filter returned undefined and will then forward
 * the message to the logger configured.
 *
 * This also wraps the entire logging logic into a promise enabled/async
 * error handler that will log any errors using the rootLogger.
 *
 * @example
 * ```
 * class MyTextInterface extends InterfaceBase {
 *   logText(str) {
 *     this._logImpl({ message: [str] });
 *   }
 * };
 *
 * const txt = new MyTextInterface({ logger: rootLogger });
 * txt.logText("Hello World");
 * ```
 *
 * @class
 * @param {Object} opts – Optional, named parameters
 * @param {Logger} opts.logger The helix logger to use
 * @param {string} [opts.level='silly'] The minimum log level to sent to the logger
 * @param {Function} [opts.filter=identity] Will be given every log message to perform
 *   arbitrary transformations; must return either another valid message object or undefined
 *   (in which case the message will be dropped).
 * @param {object} [opts.defaultFields] Additional log fields to add to every log message.
 */
class InterfaceBase {
  constructor({
    logger, level = 'silly', filter = identity, defaultFields = {}, ...unknown
  } = {}) {
    assign(this, {
      logger, level, filter, defaultFields,
    });
    if (!empty(unknown)) {
      throw new Error(`Unknown named options given to ${typename(type(this))}: ${tryInspect(unknown)}`);
    }
  }

  async flush() {
    return this.logger.flush();
  }

  _logImpl(fields_) {
    __handleLoggingExceptions(fields_, this.logger, async () => {
      const fields = this.filter({ ...this.defaultFields, ...makeLogMessage(fields_) });
      if (fields !== undefined && numericLogLevel(fields.level) <= numericLogLevel(this.level)) {
        await this.logger.log(fields);
      }
    });
  }
}

/**
 * The fields interface provides the ability to conveniently
 * specify both a message and custom fields to the underlying logger.
 *
 * @example
 * ```
 * const { SimpleInterface } = require('helix-log');
 *
 * class log = new SimpleInterface();
 * log.infoFields("Wubalubadubdub", {
 *   drunk: true
 * });
 * log.errorFields("Nooez", { error: "Evil Morty!" });
 * log.error("Nooez without custom fields");
 * ```
 *
 * @class
 * @implements LoggingInterface
 */
class SimpleInterface extends /* private */ InterfaceBase {
  _logImpl(level, ...msg) {
    const fields = msg.pop();
    /* istanbul ignore next */
    if (type(fields) !== Object) {
      throw new Error('Data given as the last argument the helix-log '
        + `SimpleInterface must be a plain Object, not a ${typename(type(fields))}.`);
    }

    const message = list(intersperse(msg, ' '));
    super._logImpl({ message, level, ...fields });
  }

  /**
   * The *Fields methods are used to log both a message
   * custom fields to the underlying logger.
   *
   * The fields object must be present (and error will be thrown
   * if the last element is not an object) and any fields specified
   * take precedence over default values.
   *
   * @example
   * ```
   * const { SimpleInterface } = require('helix-log');
   *
   * const logger = new SimpleInterface();
   *
   * // Will throw an error because the fields object is missing.
   * logger.verboseFields("Hello");
   *
   * // Will log a message 'Fooled!' with level error and the time
   * // stamp set to the y2k (although it would be more customary
   * // use logFields to indicate that the log level will be set through
   * // the fields).
   * sillyFields("Hello World", {
   *   level: 'error',
   *   timestamp: new Date("2000-01-01"),
   *   message: ["Fooled!"]
   * });
   * ```
   *
   * @memberOf SimpleInterface#
   * @method
   * @alias sillyFields
   * @alias traceFields
   * @alias debugFields
   * @alias verboseFields
   * @alias infoFields
   * @alias warnFields
   * @alias errorFields
   * @alias fatalFields
   * @param {...*} msg The message to write
   */
  /* istanbul ignore next */
  logFields(...msg) { this._logImpl('info', ...msg); }
  /* istanbul ignore next */
  sillyFields(...msg) { this._logImpl('silly', ...msg); }
  /* istanbul ignore next */
  traceFields(...msg) { this._logImpl('trace', ...msg); }
  /* istanbul ignore next */
  debugFields(...msg) { this._logImpl('debug', ...msg); }
  verboseFields(...msg) { this._logImpl('verbose', ...msg); }
  infoFields(...msg) { this._logImpl('info', ...msg); }
  /* istanbul ignore next */
  warnFields(...msg) { this._logImpl('warn', ...msg); }
  /* istanbul ignore next */
  errorFields(...msg) { this._logImpl('error', ...msg); }
  fatalFields(...msg) { this._logImpl('fatal', ...msg); }

  /**
   * These methods are used to log just a message with no custom
   * fields to the underlying logger; similar to console.log.
   *
   * This is not a drop in replacement for console.log, since this
   * does not support string interpolation using `%O/%f/...`, but should
   * cover most use cases.
   *
   * @memberOf SimpleInterface#
   * @method
   * @alias silly
   * @alias trace
   * @alias debug
   * @alias verbose
   * @alias info
   * @alias warn
   * @alias error
   * @alias fatal
   * @param {...*} msg The message to write
   */
  log(...msg) { this._logImpl('info', ...msg, {}); }
  /* istanbul ignore next */
  silly(...msg) { this._logImpl('silly', ...msg, {}); }
  /* istanbul ignore next */
  trace(...msg) { this._logImpl('trace', ...msg, {}); }
  debug(...msg) { this._logImpl('debug', ...msg, {}); }
  verbose(...msg) { this._logImpl('verbose', ...msg, {}); }
  info(...msg) { this._logImpl('info', ...msg, {}); }
  warn(...msg) { this._logImpl('warn', ...msg, {}); }
  error(...msg) { this._logImpl('error', ...msg, {}); }
  /* istanbul ignore next */
  fatal(...msg) { this._logImpl('fatal', ...msg, {}); }
}

/**
 * Creates a MultiLogger with a default console logger attached to it.
 *
 * Must always contain a logger named 'default'; it is very much recommended
 * that the default logger always be a console logger; this can serve as a good
 * fallback in case other loggers fail.
 *
 * @example
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
function createDefaultLogger() {
  return new MultiLogger({
    default: new ConsoleLogger({ level: 'info' }),
  });
}

module.exports = {
  numericLogLevel,
  tryInspect,
  serializeMessage,
  messageFormatSimple,
  messageFormatTechnical,
  messageFormatConsole,
  messageFormatJson,
  messageFormatJsonString,
  makeLogMessage,
  deriveLogger,
  createDefaultLogger,
  LoggerBase,
  FormattedLoggerBase,
  ConsoleLogger,
  FileLogger,
  MemLogger,
  MultiLogger,
  InterfaceBase,
  SimpleInterface,
};
