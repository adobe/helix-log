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
/* eslint-disable class-methods-use-this */

const {
  each, TraitNotImplemented, typename, type,
} = require('ferrum');
const { URL } = require('url');
const { JsonifyForLog, jsonifyForLog } = require('../src/serialize-json');
const { ckEq, ckThrows } = require('./util');

describe('serialize-json', () => {
  class CustomClass {
    [JsonifyForLog.sym]() {
      return [1, 2, 3, 4];
    }
  }

  class CustomException extends Error {}

  const flatInp = {
    foo: 'asd',
    bar: 42,
    baz: true,
    bang: null,
    borg: [1, 2, 3, 4],
    boom: new Date('2019-08-01T10:16:30.810Z'),
    alpha: new URL('https://example.com/Foo'),
    beta: { a: 42, b: 23 },
    gamma: new Map([[1, 42], ['asd', 23], [{}, {}]]),
    delta: new Set([1, 'asd', {}, new URL('https://example.com/bar')]),
    epsilon: new CustomClass(),
    zeta: new CustomException('Hello World'),
  };

  const flatOut = {
    foo: 'asd',
    bar: 42,
    baz: true,
    bang: null,
    borg: [1, 2, 3, 4],
    boom: '2019-08-01T10:16:30.810Z',
    alpha: 'https://example.com/Foo',
    beta: { a: 42, b: 23 },
    gamma: {
      $type: 'Map',
      values: [[1, 42], ['asd', 23], [{}, {}]],
    },
    delta: {
      $type: 'Set',
      values: [1, 'asd', {}, 'https://example.com/bar'],
    },
    epsilon: [1, 2, 3, 4],
    zeta: {
      $type: 'CustomException',
      name: 'Error',
      message: 'Hello World',
      stack: flatInp.zeta.stack,
      code: undefined,
    },
  };

  const inp = {
    alpha: {
      foo: [
        1,
        new Map([
          ['foo', new Set([flatInp])],
        ]),
      ],
    },
  };

  const out = {
    alpha: {
      foo: [
        1,
        {
          $type: 'Map',
          values: [
            ['foo', {
              $type: 'Set',
              values: [flatOut],
            }],
          ],
        },
      ],
    },
  };

  // Test each basic example
  each(flatInp, ([key, what]) => {
    it(`serializes ${typename(type(what))}`, () => {
      ckEq(jsonifyForLog(what), flatOut[key]);
    });
  });

  // Test one complex example
  it('serializes complex example', () => {
    ckEq(jsonifyForLog(inp), out);
  });

  class UnsupportedClass {}
  const forbidden = [UnsupportedClass];

  each(forbidden, (what) => {
    it(`refuses to serialize ${typename(type(what))}`, () => {
      ckThrows(TraitNotImplemented, () => jsonifyForLog({ foo: [1, 2, new Map([['bar', new Set([what])]])] }));
    });
  });
});
