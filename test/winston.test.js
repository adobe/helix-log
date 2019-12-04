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

const winston = require('winston');
const { list, map } = require('ferrum');
const { WinstonTransportInterface, MemLogger, messageFormatJson } = require('../src/index');
const { ckEq } = require('./util');

it('WinstonTransportInterface', async () => {
  const hlx = new MemLogger({ formatter: messageFormatJson });
  const win = winston.createLogger({
    transports: [new WinstonTransportInterface({
      logger: hlx,
    })],
  });

  win.error('Hello World');
  win.warn('Horrible!', { field: 'green' });

  await new Promise((res) => setTimeout(res, 10));

  ckEq(list(map(hlx.buf, ({ timestamp: _, ...fields }) => fields)), [
    {
      level: 'error',
      message: 'Hello World',
    },
    {
      field: 'green',
      level: 'warn',
      message: 'Horrible!',
    },
  ]);
});
