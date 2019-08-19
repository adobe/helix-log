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
const polka = require('polka');
const { type, empty } = require('ferrum');
const { messageFormatLoggly, LogglyLogger } = require('../src/loggly');
const {
  post, listenRandomPort, readAll, stop,
} = require('./polka-promise');

it('messageFormatLoggly', () => {
  const d0 = new Date();
  const ser = messageFormatLoggly(['Hello', 'World'], { level: 'info' });
  const d1 = new Date();
  assert(type(ser.timestamp) === Number);
  assert(d0.getTime() <= ser.timestamp && ser.timestamp <= d1.getTime());
  assert(ser.message === 'Hello World');
});

class MockLogglyServer {
  static async create() {
    const s = new MockLogglyServer();
    s.port = await listenRandomPort(s.server);
    return s;
  }

  constructor() {
    this.server = polka();

    this.requestHandlerQ = [];
    this.requestQ = [];

    post(this.server, '/inputs/:token/tag/http', async (req) => {
      const dat = { body: await readAll(req), token: req.params.token };
      if (empty(this.requestHandlerQ)) {
        this.requestQ.push(dat);
      } else {
        this.requestHandlerQ.pop()(dat);
      }
    });
  }

  nextReq() {
    assert(!this.stopped);
    if (empty(this.requestQ)) {
      return new Promise((res) => this.requestHandlerQ.push(res));
    } else {
      return Promise.resolve(this.requestQ.pop());
    }
  }

  async stop() {
    assert(!this.stopped);
    this.stopped = true;
    stop(this.server);
    assert(empty(this.requestQ));
    assert(empty(this.requestHandlerQ));
  }
}

it('LogglyLogger', async () => {
  const server = await MockLogglyServer.create();

  try {
    const logger = new LogglyLogger('fnord42', {
      logglyUrl: `http://localhost:${server.port}/inputs`,
    });
    const d0 = new Date().getTime();
    logger.log(['Hello', 42, 'World', { bar: 23 }], { level: 'warn' });

    const { token, body: rawBody } = await server.nextReq();
    const body = JSON.parse(rawBody);

    const d1 = new Date().getTime();

    assert.strictEqual(token, 'fnord42');
    assert(d0 <= body.timestamp && body.timestamp <= d1);
    assert.strictEqual(body.level, 'warn');
    assert.strictEqual(body.message, 'Hello 42 World');
  } finally {
    await server.stop();
  }
});
