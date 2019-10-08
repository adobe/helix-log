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
const { LogdnaLogger, makeLogMessage } = require('../src');
const {
  post, listenRandomPort, readAll, stop,
} = require('./polka-promise');
const { ckEq } = require('./util');

const instanciate = (T, fields) => {
  const v = Object.create(T.prototype);
  assign(v, fields);
  return v;
};

class MockLogdnaServer {
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

    post(me.server, '/logs/ingest', async (req, _) => {
      const dat = {
        body: await readAll(req),
        query: req.query,
      };

      if (empty(me.requestHandlerQ)) {
        me.requestQ.push(dat);
      } else {
        me.requestHandlerQ.pop()(dat);
      }
    });

    me.port = await listenRandomPort(me.server);

    return me;
  }

  async nextReq() {
    assert(!this.stopped);
    const reqP = empty(this.requestQ)
      ? new Promise((res) => this.requestHandlerQ.push(res))
      : Promise.resolve(this.requestQ.pop());
    const req = await reqP;
    req.body = JSON.parse(req.body);
    req.query = { ...req.query }; // type(req.query) == undefined for whatever strange reason
    return req;
  }

  async stop() {
    assert(!this.stopped);
    this.stopped = true;
    stop(this.server);
    assert(empty(this.requestQ));
    assert(empty(this.requestHandlerQ));
  }
}

it('LogdnaLogger', async () => {
  const server = await MockLogdnaServer.create();

  try {
    const apikey = 'fnord42';
    const app = 'helix';
    const file = 'unittesting';

    const logger = new LogdnaLogger(apikey, app, file, {
      apiurl: `http://localhost:${server.port}/`,
    });

    const t0 = new Date().getTime();
    logger.log(makeLogMessage({
      message: ['Hello ', 42, ' World ', { bar: 23 }],
      fnord: 42,
    }));

    const { body, query } = await server.nextReq();

    const line = JSON.parse(body.lines[0].line);
    const t1 = new Date(Number(body.lines[0].timestamp));
    const t2 = new Date(line.timestamp).getTime();
    const t3 = new Date(Number(query.now));

    delete body.lines[0].line;
    delete body.lines[0].timestamp;
    delete line.timestamp;
    delete query.now;

    assert((t1 - t0) < 10); // 10 ms window to send
    assert((t2 - t0) < 10);
    assert((t3 - t0) < 10);
    ckEq(body, {
      lines: [{
        level: 'info',
        app,
        file,
      }],
    });
    ckEq(query, {
      apikey,
      hostname: hostname(),
    });
    ckEq(line, {
      level: 'info',
      message: 'Hello 42 World { bar: 23 }',
      fnord: 42,
    });
  } finally {
    await server.stop();
  }
});
