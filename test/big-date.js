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

const { inspect } = require('util');
const { hrtime } = require('process');
const assert = require('assert');
const Big = require('big.js');
const {
  each, range0, assertUneq, shallowclone, deepclone,
} = require('ferrum');
const {
  BigDate, _bigFloor, _bigDecimalPlaces, jsonifyForLog,
} = require('../src');
const { ckEq } = require('./util');

describe('BigDate', () => {
  describe('construction, toISOString(), preciseTime()', () => {
    const ck = (what, iso, time, ...args) => {
      it(what, () => {
        const d = new BigDate(...args);
        ckEq(d.toISOString(), iso);
        assert(d.preciseTime().eq(time));
      });
    };

    const iso = '9051-01-24T10:22:25.678Z';
    const isoLong = '9051-01-24T10:22:25.678000000Z';
    const nonUTCIso = '9051-01-24T18:22:25.678+0800';
    const millis = 223456789345678;

    const bigISO = '1970-01-01T00:00:00.9872345678902345678Z';
    const bigMillis = Big('987.2345678902345678');

    ck('from Millis', isoLong, millis, millis);
    ck('from Big Millis', bigISO, bigMillis, bigMillis);

    ck('from ISO', isoLong, millis, iso);
    ck('from ISO 2', isoLong, millis, isoLong);
    ck('from Big ISO', bigISO, bigMillis, bigISO);
    ck('from Non UTC ISO', isoLong, millis, nonUTCIso);

    ck('from Date', isoLong, millis, new Date(millis));
    ck('from Big Date', bigISO, bigMillis, new BigDate(bigMillis));

    const d = new Date(millis);
    ck('from components', isoLong, millis,
      d.getFullYear(), d.getMonth(), d.getDate(),
      d.getHours(), d.getMinutes(), d.getSeconds(),
      d.getMilliseconds());

    it('from sparse components', () => {
      ckEq(
        new BigDate(2019, 1),
        new BigDate(new Date(2019, 1)),
      );
    });

    const bd = new BigDate(bigMillis);
    ck('from Big components', bigISO, bigMillis,
      bd.getFullYear(), bd.getMonth(), bd.getDate(),
      bd.getHours(), bd.getMinutes(), bd.getSeconds(),
      bd.preciseTime().mod(1000));

    const ckFromHrtime = (hr) => {
      const ref = new BigDate();
      const actual = BigDate.fromHrtime(hr);
      assert(ref.preciseTime().sub(actual.preciseTime()).lt(1));
    };

    it('fromHrtime', () => ckFromHrtime(hrtime()));

    if (hrtime.bigint) {
      it('fromHrtime with BigInt', () => ckFromHrtime(hrtime.bigint()));
    }
  });

  describe('static preciseTime', () => {
    it('with Date', () => {
      const v = BigDate.preciseTime(new Date(300));
      assert(v instanceof Big);
      assert(v.eq(300));
    });

    it('with BigDate', () => {
      const v = BigDate.preciseTime(new BigDate(Big('4.8371923798217')));
      assert(v instanceof Big);
      assert(v.eq('4.8371923798217'));
    });
  });

  describe('measures time', () => {
    it('Relative to Date', () => {
      each(range0(100), () => {
        const a = new Date();
        const b = new BigDate();
        assert(b.preciseTime().sub(a.getTime()).abs().lt(4));
      });
    });

    it('increasing steadily', () => {
      let prev = new BigDate().preciseTime();
      each(range0(100), () => {
        const cur = new BigDate().preciseTime();
        assert(cur.sub(prev).lt(500));
        assert(cur.gt(prev));
        prev = cur;
      });
    });

    it('sleep reference', async () => {
      const d0 = new BigDate();
      await new Promise((res) => setTimeout(res, 5));
      const d1 = new BigDate();
      const tdiff = d1.preciseTime().sub(d0.preciseTime());
      assert(tdiff.gte(5));
      assert(tdiff.lt(10));
    });
  });

  it('setPreciseTime()', () => {
    const t = 1234567.1123456;
    const a = new BigDate(t);
    const b = new BigDate();
    assertUneq(a, b);
    b.setPreciseTime(t);
    ckEq(a, b);
  });

  describe('converts to json with high precision', () => {
    const iso = '2019-11-07T17:25:20.293179804Z';
    const res = `"${iso}"`;
    const d = new BigDate(iso);
    it('JSON.stringify', () => ckEq(JSON.stringify(d), res));
    it('jsonifyForLog', () => ckEq(JSON.stringify(jsonifyForLog(d)), res));
  });

  it('inspect()', () => {
    const iso = '2019-11-07T17:25:20.293179804333Z';
    ckEq(inspect(new BigDate(iso)), `BigDate ${iso}`);
  });

  it('toString()', () => {
    const d = new BigDate();
    ckEq(String(d), String(new Date(d)));
  });

  describe('implements Interfaces', () => {
    it('Equals', () => {
      const a = new BigDate(Big('1234567.1123456'));
      const b = new BigDate(Big('1234568.1123456'));
      const c = new BigDate(Big('1234567.1123451'));
      ckEq(a, new BigDate(a));
      assertUneq(a, b);
      assertUneq(a, c);
    });

    it('Shallowclone', () => {
      const a = new BigDate();
      const b = shallowclone(a);
      assert.notStrictEqual(a, b);
      ckEq(a, b);
      b.setMinutes(b.getMinutes() + 1);
      assertUneq(a, b);
    });

    it('Deepclone', () => {
      const a = new BigDate();
      const b = deepclone(a);
      assert.notStrictEqual(a, b);
      ckEq(a, b);
      b.setMinutes(b.getMinutes() + 1);
      assertUneq(a, b);
    });
  });
});
