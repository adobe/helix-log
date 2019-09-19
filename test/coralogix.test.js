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

const { assign } = Object;
const assert = require('assert');
const { hostname } = require('os');
const polka = require('polka');
const { type, typename, empty } = require('ferrum');
const { CoralogixLogger } = require('../src/coralogix');
const {
  post, listenRandomPort, readAll, stop,
} = require('./polka-promise');
const { ckEq } = require('./util');

const instanciate = (T, fields) => {
  const v = Object.create(T.prototype);
  assign(v, fields);
  return v;
};

class MockCoralogixServer {
  constructor() {
    const T = typename(type(this));
    throw new Error(`${T} requires async creation; call \`${T}.create(...)\`.`);
  }

  static async create() {
    const me = instanciate(this, {
      requestHandlerQ: [],
      requestQ: [],
      server: polka(),
    });

    post(me.server, '/logs', async (req, _) => {
      const dat = await readAll(req);

      if (empty(me.requestHandlerQ)) {
        me.requestQ.push(dat);
      } else {
        me.requestHandlerQ.pop()(dat);
      }
    });

    me.port = await listenRandomPort(me.server);

    return me;
  }

  nextReq() {
    assert(!this.stopped);
    const reqP = empty(this.requestQ)
      ? new Promise((res) => this.requestHandlerQ.push(res))
      : Promise.resolve(this.requestQ.pop());
    return reqP.then(JSON.parse);
  }

  async stop() {
    assert(!this.stopped);
    this.stopped = true;
    stop(this.server);
    assert(empty(this.requestQ));
    assert(empty(this.requestHandlerQ));
  }
}

it('CoralogixLogger', async () => {
  const server = await MockCoralogixServer.create();

  try {
    const apikey = 'fnord42';
    const app = 'helix';
    const subsystem = 'unittesting';

    const logger = new CoralogixLogger(apikey, app, subsystem, {
      apiurl: `http://localhost:${server.port}/`,
      level: 'info',
    });

    const t0 = new Date().getTime();
    logger.log(['Hello', 42, 'World', { bar: 23 }], { level: 'silly' }); // should not be logged
    logger.log(['Hello', 42, 'World', { bar: 23 }], { level: 'warn' });

    const req = await server.nextReq();

    const text = JSON.parse(req.logEntries[0].text);
    const t1 = req.logEntries[0].timestamp;
    const t2 = new Date(text.timestamp).getTime();

    delete req.logEntries[0].text;
    delete req.logEntries[0].timestamp;
    delete text.timestamp;


    assert((t1 - t0) < 10); // 10 ms window to send
    assert((t2 - t0) < 10);
    ckEq(req, {
      privateKey: apikey,
      applicationName: app,
      subsystemName: subsystem,
      computerName: hostname(),
      logEntries: [{
        severity: 4,
      }],
    });
    ckEq(text, {
      bar: 23,
      level: 'warn',
      message: 'Hello 42 World',
    });
  } finally {
    await server.stop();
  }
});