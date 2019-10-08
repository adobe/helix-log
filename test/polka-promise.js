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

/* eslint-disable no-param-reassign */

const { round, random } = Math;
const http = require('http');
const { join } = require('ferrum');
const { error } = require('../src/log');

/**
 * Promisived polka::post()
 * @function
 * @param {Polka} server The polka instance
 * @param {string} path
 * @param {Function} fn This can be any sync or async functions.
 *   Errors are automatically handled and return a 500 error.
 */
const post = (server, path, fn) => {
  server.post(path, async (req, res) => {
    try {
      res.end(await fn(req, res));
    } catch (er) {
      error('Error Processing HTTP Request', er);
      res.statusCode = 500;
      res.end('Internal error!');
    }
  });
};

/**
 * Promisified polka::listen() (with not-terrible erorr handling)
 *
 * @function
 * @param {Polka} server The polka instance
 * @param {number} port
 * @returns {Promise} Emitted when the polka server has started to listen
 */
const listen = async (server, port) => {
  // Make sure we have a server to install our events on
  if (!server.server) {
    server.server = http.createServer();
  }

  let listeningHandler;
  let errorHandler;
  try {
    // So, unfortunately the listen() function is pretty fucked up it seems;
    // this is not the fault of polka: The http server's listen function should
    // return any EADDRINUSE errors to the function. It doesn't, instead such errors
    // are emitted to the `error` handler only. This is highly inconvenient for
    // us. By using the combination of two errors here, we make sure that really all
    // errors are emitted in the process.
    const listenEvent = new Promise((res, rej) => {
      server.server.on('listening', res);
      listeningHandler = res;
      server.server.on('error', rej);
      errorHandler = rej;
    });

    const listenFn = new Promise((res, rej) => {
      server.listen(port, (err) => {
        if (err) {
          rej(err);
        } else {
          res();
        }
      });
    });

    // NOTE: The order here is important; apparantly if an error event is
    // fired, the callback won't be called any more *cries*
    await listenEvent;
    await listenFn;
  } finally {
    // Making sure here we do not remove those if they haven't been
    // installed properly (in case of an error during the setup)
    if (listeningHandler) {
      server.server.removeListener('listening', listeningHandler);
    }
    if (errorHandler) {
      server.server.removeListener('error', errorHandler);
    }
  }
};

/**
 * Open an http server on a random port
 * @function
 * @param {Polka} server The polka instance
 * @returns {Promise<number>} Port the server was opened on
 */
const listenRandomPort = async (server) => {
  while (true) {
    try {
      // Random port in the range ]10000; 2**16[
      const port = round(random() * ((2 ** 16) - 10001) + 10001);
      await listen(server, port);
      return port;
    } catch (er) {
      if (er.code !== 'EADDRINUSE') {
        throw er;
      }
    }
  }
};

/**
 * Stops the given polka server.
 * @function
 * @param {Polka} server
 * @returns {Promise<>} Resolves when the server is really closed
 */
const stop = async (server) => {
  let closeHandler;
  let errHandler;
  try {
    const onClose = new Promise((res, rej) => {
      server.server.on('error', rej);
      errHandler = rej;
      server.server.on('close', res);
      closeHandler = res;
    });
    server.server.close();
    await onClose;
  } finally {
    if (closeHandler) {
      server.server.removeListener('error', errHandler);
    }
    if (errHandler) {
      server.server.removeListener('close', closeHandler);
    }
  }
};

/**
 * Read all data from a readable stream as a utf-8 string.
 * @function
 * @param {ReadableStream} stream
 * @returns {Promise<string>}
 */
const readAll = (stream) => new Promise((res, rej) => {
  const buf = [];
  stream.on('data', (dat) => buf.push(dat));
  stream.on('end', () => res(join(buf, '')));
  stream.on('error', rej);
});

module.exports = {
  post, listen, listenRandomPort, readAll, stop,
};
