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

const assert = require('assert');
const os = require('os');
const { pid } = require('process');
const bunyan = require('bunyan');
const { size, type, iter } = require('ferrum');
const {
  BunyanStreamInterface, messageFormatJson, MemLogger,
  eraseBunyanDefaultFields, messageFormatSimple,
} = require('../src/index');
const { ckEq } = require('./util');

describe('BunyanStreamInterface', () => {
  it('.createStream()', () => {
    const opt = BunyanStreamInterface.createStream();
    ckEq(size(opt), 2);
    ckEq(opt.type, 'raw');
    ckEq(type(opt.stream), BunyanStreamInterface);
  });

  it('._bunyan2hlxLevel()', () => {
    const data = {
      NaN: 'fatal',
      Inifinty: 'fatal',
      '-Infinity': 'silly',
      9: 'silly',
      10: 'trace',
      19: 'trace',
      20: 'debug',
      29: 'debug',
      30: 'info',
      39: 'info',
      40: 'warn',
      49: 'warn',
      50: 'error',
      59: 'error',
      60: 'fatal',
      1000: 'fatal',
    };
    for (const [i, o] of iter(data)) {
      ckEq(BunyanStreamInterface.prototype._bunyan2hlxLevel(Number(i)), o);
    }
  });

  it('forwards log messages', () => {
    const hlx = new MemLogger({ formatter: messageFormatJson });
    const bun = bunyan.createLogger({
      name: 'helixTestLogger',
      streams: [
        BunyanStreamInterface.createStream({ logger: hlx }),
      ],
    });

    const t0 = new Date().getTime();
    bun.info('Hello World');
    bun.warn({ lang: 'fr' }, 'au revoir');

    const t1 = new Date(hlx.buf[0].timestamp);
    const t2 = new Date(hlx.buf[1].timestamp);
    delete hlx.buf[0].timestamp;
    delete hlx.buf[1].timestamp;
    assert(t1 - t0 < 5); // 5ms time window
    assert(t2 - t0 < 5);

    const hostname = os.hostname();
    ckEq(hlx.buf, [
      {
        bunyanLevel: 30,
        level: 'info',
        message: 'Hello World',
        name: 'helixTestLogger',
        v: 0,
        hostname,
        pid,
      },
      {
        bunyanLevel: 40,
        lang: 'fr',
        level: 'warn',
        message: 'au revoir',
        name: 'helixTestLogger',
        v: 0,
        hostname,
        pid,
      },
    ]);
  });
});

it('eraseBunyanDefaultFields', () => {
  const hlx = new MemLogger({ formatter: messageFormatSimple });
  const iface = new BunyanStreamInterface({
    logger: hlx,
    filter: eraseBunyanDefaultFields,
  });
  const bun = bunyan.createLogger({
    name: 'helixTestLogger',
    streams: [{ type: 'raw', stream: iface }],
  });

  bun.info('Hello World');
  bun.warn({ lang: 'fr' }, 'au revoir');

  // This checks that bunyan fields are removed, even ones added
  // in the future (since we actually use bunyan to generate the fields)
  ckEq(hlx.buf, [
    '[INFO] Hello World',
    "[WARN] au revoir { lang: 'fr' }",
  ]);
});
