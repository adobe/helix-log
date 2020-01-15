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
const MultiLogger = require('./MultiLogger.js');
const ConsoleLogger = require('./ConsoleLogger.js');

/**
 * The logger all other loggers attach to.
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
const rootLogger = new MultiLogger({
  default: new ConsoleLogger({ level: 'info' }),
});
rootLogger.isRootLogger = true;

module.exports = {
  rootLogger,
};
