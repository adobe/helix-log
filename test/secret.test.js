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

import assert from 'node:assert';
import { inspect } from 'node:util';

import { Secret } from '../src/index.js';

import { ckEq } from './util.js';

describe('Secret', () => {
  it('Can be initialized, explicitly set and extracted', () => {
    const s = new Secret(42);
    ckEq(s.secret, 42);
    s.secret = 23;
    ckEq(s.secret, 23);
  });

  it('Can be initialized from other secret', () => {
    const s = new Secret(new Secret(42));
    ckEq(s.secret, 42);
  });

  const ck = (what, fn) => {
    it('cannot be extracted using ', () => {
      const uu = 'cb1e7724-be69-432f-bf83-9762ba5608ee';
      const s = new Secret(uu);
      const x = inspect(fn(s), { depth: null, colors: false });
      assert(!x.match(uu));
    });
  };

  ck('inspect', (x) => x);
  ck('toString', (x) => x.toString());
  ck('JSON', (x) => JSON.stringify(x));
  ck('Object.keys', (x) => Object.keys(x));
  ck('Object.getOwnPropertyDescriptors', (x) => Object.getOwnPropertyDescriptors(x));
});
