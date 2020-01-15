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
 * described here.
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
declare interface LoggingInterface {
  /**
   *
   * @param options.logger
   * @param options.level
   * @param options.filter
   * @param options.defaultFields
   */
  constructor(options: object);

}
