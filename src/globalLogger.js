/*
 * Copyright 2020 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
const { type } = require('ferrum');
const SimpleInterface = require('./SimpleInterface.js');
const { rootLogger } = require('./rootLogger.js');
const __globalLogCounter = require('./globalLogCounter.js');

const rootInterface = new SimpleInterface();

const __globalLogImpl = (lvl, ...msg) => {
  let ex;

  /* istanbul ignore next */
  try {
    rootInterface._logImpl(lvl, ...msg);
  } catch (e) {
    ex = e;
  }

  /* istanbul ignore next */
  if (ex !== undefined) {
    // eslint-disable-next-line no-console
    console.error('Utter failure logging because:', ex);
  }

  const logFailure = ex !== undefined
    || type(rootLogger.loggers) !== Map
    || (__globalLogCounter.fwdCount === 0 && rootLogger.loggers.size === 0);
  /* istanbul ignore next */
  if (logFailure) {
    // eslint-disable-next-line no-console
    console.error('Utter failure logging message:', msg);
  }
};

/**
 * Log just a message to the rootLogger using the SimpleInterface.
 *
 * Alias for `new SimpleInterface().log(...msg)`.
 *
 * This is not a drop in replacement for console.log, since this
 * does not support string interpolation using `%O/%f/...`, but should
 * cover most use cases.
 *
 * @function
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
const log = (...msg) => __globalLogImpl('log', ...msg, {});
const fatal = (...msg) => __globalLogImpl('fatal', ...msg, {});
const error = (...msg) => __globalLogImpl('error', ...msg, {});
const warn = (...msg) => __globalLogImpl('warn', ...msg, {});
const info = (...msg) => __globalLogImpl('info', ...msg, {});
const verbose = (...msg) => __globalLogImpl('verbose', ...msg, {});
const debug = (...msg) => __globalLogImpl('debug', ...msg, {});
const trace = (...msg) => __globalLogImpl('trace', ...msg, {});
const silly = (...msg) => __globalLogImpl('silly', ...msg, {});

/**
 * Log to the rootLogger using the SimpleInterface with custom fields.
 *
 * Alias for `logFields(...msg)`.
 *
 * @function
 * @name log.fields
 * @alias silly.fields
 * @alias trace.fields
 * @alias debug.fields
 * @alias verbose.fields
 * @alias info.fields
 * @alias warn.fields
 * @alias error.fields
 * @alias fatal.fields
 * @param {...*} msg The message to write
 */
log.fields = (...msg) => __globalLogImpl('log', ...msg);
fatal.fields = (...msg) => __globalLogImpl('fatal', ...msg);
error.fields = (...msg) => __globalLogImpl('error', ...msg);
warn.fields = (...msg) => __globalLogImpl('warn', ...msg);
info.fields = (...msg) => __globalLogImpl('info', ...msg);
verbose.fields = (...msg) => __globalLogImpl('verbose', ...msg);
debug.fields = (...msg) => __globalLogImpl('debug', ...msg);
trace.fields = (...msg) => __globalLogImpl('trace', ...msg);
silly.fields = (...msg) => __globalLogImpl('silly', ...msg);

module.exports = {
  fatal,
  error,
  info,
  log,
  warn,
  verbose,
  debug,
  trace,
  silly,
};
