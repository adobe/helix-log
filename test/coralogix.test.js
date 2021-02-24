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
const http = require('http');
const polka = require('polka');
const { type, typename, empty } = require('ferrum');
const { CoralogixLogger, makeLogMessage } = require('../src');
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
      stopped: true,
    });

    post(me.server, '/logs', async (req, res) => {
      const dat = await readAll(req);

      if (empty(me.requestHandlerQ)) {
        me.requestQ.push(dat);
      } else {
        me.requestHandlerQ.pop()(dat);
      }

      res.end('');
    });

    return me;
  }

  async listen() {
    assert(this.stopped);
    this.stopped = false;
    this.port = await listenRandomPort(this.server);
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
    this.port = undefined;
    stop(this.server);
    assert(empty(this.requestQ));
    assert(empty(this.requestHandlerQ));
  }
}

describe('Coralogix Logger', () => {
  const apikey = 'fnord42';
  const app = 'helix';
  const subsystem = 'unittesting';

  let server;
  beforeEach(async () => {
    server = await MockCoralogixServer.create();
  });

  afterEach(async () => {
    await server.stop();
  });

  it('can handle outages', async () => {
    const logger = new CoralogixLogger(apikey, app, subsystem, {
      apiurl: 'https://coralogix.invalid/',
    });

    const t0 = new Date().getTime();
    logger.log(makeLogMessage({
      message: ['Hello ', 42, ' World ', { bar: 23 }],
      fnord: 42,
    }));

    // Start the server now to prove that CoralogixLogger can deal with
    // intermittent outages
    await server.listen();
    logger.apiurl = `http://localhost:${server.port}/`;
    logger._agent = http.globalAgent;

    const req = await server.nextReq();

    const text = JSON.parse(req.logEntries[0].text);
    const t1 = req.logEntries[0].timestamp;
    const t2 = new Date(text.timestamp).getTime();

    delete req.logEntries[0].text;
    delete req.logEntries[0].timestamp;
    delete text.timestamp;

    assert((t1 - t0) < 12); // 10 ms window to send
    assert((t2 - t0) < 12);
    ckEq(req, {
      privateKey: apikey,
      applicationName: app,
      subsystemName: subsystem,
      computerName: hostname(),
      logEntries: [{
        severity: 3,
      }],
    });
    ckEq(text, {
      level: 'info',
      message: 'Hello 42 World { bar: 23 }',
      fnord: 42,
    });
  });

  it('can make requests immediately', async () => {
    await server.listen();
    const logger = new CoralogixLogger(apikey, app, subsystem, {
      apiurl: `http://localhost:${server.port}/`,
    });
    logger._agent = http.globalAgent;

    logger.log(makeLogMessage({
      message: 'foo',
      host: 'bar',
      application: 'baz',
      subsystem: 'bang',
    }));

    const req2 = await server.nextReq();
    const text2 = JSON.parse(req2.logEntries[0].text);
    delete req2.logEntries[0].text;
    delete req2.logEntries[0].timestamp;
    delete text2.timestamp;

    ckEq(req2, {
      privateKey: apikey,
      computerName: 'bar',
      applicationName: 'baz',
      subsystemName: 'bang',
      logEntries: [{
        severity: 3,
      }],
    });
    ckEq(text2, {
      message: 'foo',
      level: 'info',
      host: 'bar',
      application: 'baz',
      subsystem: 'bang',
    });

    logger.log({
      level: 'info',
      timestamp: 'boo',
      message: ['foo'],
      host: 'bar',
      application: 'baz',
      subsystem: 'bang',
    });

    const req3 = await server.nextReq();
    const text3 = JSON.parse(req3.logEntries[0].text);
    delete text3.timestamp;

    ckEq(text3, {
      message: 'foo',
      level: 'info',
      host: 'bar',
      application: 'baz',
      subsystem: 'bang',
      infrastructure: 'Error: Invalid timestamp passed: boo',
    });
  });

  it('clears pending requests on success', async () => {
    await server.listen();
    const logger = new CoralogixLogger(apikey, app, subsystem, {
      apiurl: `http://localhost:${server.port}/`,
    });
    logger._agent = http.globalAgent;

    ckEq(logger._tasks.length, 0);
    logger.log(makeLogMessage({
      message: 'foo',
      host: 'bar',
      application: 'baz',
      subsystem: 'bang',
    }));
    ckEq(logger._tasks.length, 1);
    await server.nextReq();
    // wait a tick
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
    ckEq(logger._tasks.length, 0);
  });

  it('waits for pending requests on flush', async () => {
    await server.listen();
    const logger = new CoralogixLogger(apikey, app, subsystem, {
      apiurl: `http://localhost:${server.port}/`,
    });
    logger._agent = http.globalAgent;

    ckEq(logger._tasks.length, 0);
    logger.log(makeLogMessage({
      message: 'foo',
      host: 'bar',
      application: 'baz',
      subsystem: 'bang',
    }));
    ckEq(logger._tasks.length, 1);
    const slowServer = new Promise((resolve) => {
      setTimeout(() => {
        server.nextReq().then(resolve);
      });
    }, 100);

    await logger.flush();
    await slowServer;
    ckEq(logger._tasks.length, 0);
  });

  it('clears pending requests on error', async () => {
    await server.listen();
    const logger = new CoralogixLogger(apikey, app, subsystem, {
      apiurl: `https://localhost:${server.port}/invalid`,
    });
    logger._agent = http.globalAgent;

    ckEq(logger._tasks.length, 0);
    logger.log(makeLogMessage({
      message: 'foo',
      host: 'bar',
      application: 'baz',
      subsystem: 'bang',
    }));
    ckEq(logger._tasks.length, 1);
    // wait a bit
    await new Promise((resolve) => setTimeout(resolve, 100));
    ckEq(logger._tasks.length, 0);
  });
});
