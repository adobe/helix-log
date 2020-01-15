
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
const {
  black, bgRed, bgYellow, bgBlackBright, bgBlueBright,
} = require('colorette');
const { join, empty } = require('ferrum');
const { jsonifyForLog } = require('./serialize-json');
const { serializeMessage } = require('./utils.js');

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
const messageFormatSimple = (fields) => {
  // eslint-disable-next-line
  const { level, timestamp, message, ...rest } = fields;
  const full = empty(rest) ? message : [...message, ' ', rest];
  return `[${level.toUpperCase()}] ${serializeMessage(full)}`;
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
const messageFormatTechnical = (fields) => {
  const {
    level, timestamp, message, ...rest
  } = fields;

  // Timestamp with extra spaces
  const ts = timestamp.toISOString().replace(/T|(?=Z)|(?=[+-]\d+$)/g, ' ');
  const pref = [level.toUpperCase(), ts];

  const fullMsg = empty(rest) ? message : [...message, ' ', rest];
  return `[${join(pref, ' ')}] ${serializeMessage(fullMsg)}`;
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
const messageFormatConsole = (fields) => {
  // eslint-disable-next-line
  const { level, timestamp, message, ...rest } = fields;
  const fullMsg = empty(rest) ? message : [...message, ' ', rest];
  const ser = serializeMessage(fullMsg, { colors: true });
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
const messageFormatJson = ({ message, ...fields }) => jsonifyForLog({
  message: serializeMessage(message),
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

module.exports = {
  messageFormatSimple,
  messageFormatTechnical,
  messageFormatConsole,
  messageFormatJson,
  messageFormatJsonString,
};
