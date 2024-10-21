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
const { MemLogger, serializeMessage, SimpleInterface } = require('./log');

const ANSI_REGEXP = RegExp([
  '[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[a-zA-Z\\d]*)*)?\\u0007)',
  '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PRZcf-ntqry=><~]))',
].join('|'), 'g');

/**
 * Creates a test logger that logs to the console but also to an internal buffer. The contents of
 * the buffer can be retrieved with {@code Logger#getOutput()} which will flush also close the
 * logger. Each test logger will be registered with a unique category, so that there is no risk of
 * reusing a logger in between tests.
 * @params {object} config logger config
 * @params {string} [config.level='debug'] log level
 * @params {bool} [config.keepANSI=false] enable to keep ANSI characters in string
 * @returns {SimpleInterface}
 */
function createTestLogger(config = {}) {
  const memLogger = new MemLogger({
    level: 'silly',
  });

  const plainMessage = (msg) => serializeMessage(msg.message);
  const stripMessage = (msg) => serializeMessage(msg.message).replace(ANSI_REGEXP, '');
  const msgFormat = config.keepANSI ? plainMessage : stripMessage;

  const testLogger = new SimpleInterface({
    level: config.level || 'debug',
    logger: memLogger,
  });

  return new Proxy(testLogger, {
    get(target, prop) {
      if (prop === 'getOutput') {
        return () => `${memLogger.buf.map((msg) => `${msg.level}: ${msgFormat(msg)}`).join('\n')}\n`;
      }
      return target[prop];
    },
  });
}

module.exports = {
  createTestLogger,
};
