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
declare interface Logger {
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
  log(...fields): void;
}
