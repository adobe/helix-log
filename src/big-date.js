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
const { max, floor, abs } = Math;
const { inspect } = require('util');
const { hrtime } = require('process');
const Big = require('big.js');
const {
  size, type, typename, join, take, repeat,
  Shallowclone, Deepclone, Equals,
} = require('ferrum');

// Here we calculate the offset between a hrtime() derived epoch
// and a new Date() derived one. This will allow us to derive the
// epoch/unix time easily from the high resolution clock.
// This method can introduce an error of +-1ms when looking just
// at the millisecond portion of the time; we could eliminate this
// error by waiting for the Date based epoch to be incremented and
// measuring the hrtime offset at this point, but it's not worth
// the effort.
const _calcHrtimeOff = () => {
  // Low latency portion
  const h = hrtime(); // hrtime first because date has more overhead
  const d = new Date();
  // Low latency portion end

  // Parse date
  const dateMs = d.getTime();

  // Parse hrtime
  const hrtimeMs = h[0] * 1e3 + floor(h[1] / 1e6);
  const hrtimeNs = h[1] % 1e6;

  return [(dateMs - hrtimeMs), hrtimeNs];
};

let _hrtimeOffset = _calcHrtimeOff();

/**
 * A Date class capable of storing timestamps at arbitrary precisions that can
 * be used as a drop-in replacement for date.
 *
 * When generating timestamps at quick succession `Date` will often yield the
 * same result:
 *
 * ```js
 * const assert = require('assert');
 * const a = new Date();
 * const b = new Date();
 * assert.strictEqual(a.toISOString(), b.toISOString())
 * ```
 *
 * This is often problematic. E.g. in the case of helix-log this can lead to log
 * messages being displayed out of order. Using `process.hrtime()` is not an option
 * either because it's time stamps are only really valid on the same process.
 *
 * In order to remedy this problem, helix-log was created: It measures time at a very
 * high precision (nano seconds) while maintaining a reference to corordinated universal time
 *
 * ```js
 * const assert = require('assert');
 * const { BigDate } = require('@adobe/helixLog')
 * const a = new BigDate();
 * const b = new BigDate();
 * assert.notStrictEqual(a.toISOString(), b.toISOString());
 * ```
 *
 * # Precision in relation to Corordinated Universal Time
 *
 * Mostly depends on how well synchronized the system clock is…usually between 20ms and 200ms.
 * This goes for both Date as well as BigDate, although BigDate can add up to 1ms of extra error.
 *
 * # Precision in relation to Date
 *
 * BigDate can add up to 1ms out of sync with Date.
 *
 * When measuring comparing `BigDate.preciseTime()` and `Date.getTime()` you may
 * find differences of up to 2.5ms due to the imprecision of measurement.
 *
 * # Precision in relation to hrtime()
 *
 * Using BigDate::fromHrtime() you can convert hrtime timestamps to BigDate.
 * The conversion should be 1 to 1 (BigDate uses hrtime internally), but the
 * internal reference will be recalculated every time the clock jumps (e.g on
 * hibernation or when the administrator adjusts the time). This can lead to
 * fromHrtime interpreting timestamps vastly different before and after the jump.
 *
 * # For benchmarking/measurement overhead
 *
 * BigDate can be used for benchmarking and is better at it than Date and worse at it than hrtime.
 *
 * Measuring the actual overhead proofed difficult, because results where vastly different
 * depending on how often hrtime was called.
 *
 *          | Worst | Cold  |  Hot  | Best
 * -------- | ----- | ----- | ----- | -----
 * Hrtime   |  10µs | 20µs  | 1.5µs |  80ns
 * BigDate  | 500µs | 80µs  |   4µs | 250ns
 *
 * Worst: First few invocations, bad luck
 * Cold: Typical first few invocations.
 * Hot: After tens to hundreds of invocations
 * Best: After millions of invocations
 *
 * @class
 * @implements Equals
 * @implements Deepclone
 * @implements Shallowclone
 *
 * @constructor
 * The default constructor can be used to get the current point in time as a BigDate.
 *
 * @constructor
 * @param {Date|BigDate} Converts a Date to a BigDate or copies a BigDate
 *
 * @constructor
 * @param {String} Construct a BigDate from a string (like date, but supports arbitrary
 *   precision in the ISO 8601 String decimal places)
 *
 * @constructor
 * @param {Number|Big|Bigint} Construct a BigDate from the epoch value (unix time/number of
 *   milliseconds elapsed sinc 1970-01-01). Decimal places are honored and can be used to
 *   supply an epoch value of arbitrary precision.
 *
 * @constructor
 * @param {...*} Can be used to construct a BigDate from components (year, month, day, hours,
 *   minutes, seconds, milliseconds with decimal places)
 */
class BigDate extends Date {
  /**
   * The nanosecond component not stored by the Date base.
   *
   * @private
   * @member {Number|Big} _frac
   */

  constructor(v) {
    // The following code has been optimized in order to
    // reduce the overhead when using BigDate to actually
    // measure time both when the code is hot (invoked many times)
    // and when cold (invoked very few times).
    //
    // Optimization measures taken:
    // - Use `arguments` (down below) instead of declaring variadic args in the constructor
    // - Avoid double initialization (all the init functions initialize the underlying
    //   Date empty and later set all values. Here we directly use super for initialization)
    // - Avoid calling methods/manual unlinking (not benchmarked! We may yet decide to move the
    //   math portion to it's own function so we can avoid the triple code duplication we end
    //   up with in here).
    // - Forgoing the use of `Big` for calculations; instead we use math with two-tuples of [ms, ns]
    //   all complete with fully manual addition overflow handling
    // - Using a native Number for _hrtime instead of converting to `Big` (this means _hrtime can
    //   contain multiple types).
    //
    // These optimization *have* been evaluated using benchmarks. When modifying
    // this class further benchmarking it is *highly* recommended. I suggest
    // measuring the time stamping overhead:
    //
    // ```
    // const a = hrtime.bigint();
    // const b = hrtime.bigint();
    // return b - a;
    // ```
    //
    // Execute many thousands of times, discard the first 10000 and average the rest.
    //
    // ```
    // const a = hrtime.bigint();
    // const _ = new BigInt();
    // const b = hrtime.bigint();
    // return b - a;
    // ```
    //
    // Execute many thousands of times; average separately the results after different iteration
    // numbers and subtract the measured hrtime latency.
    //
    // Average separately:
    //
    // - Run 1
    // - Run 2
    // - Run 3,4,5
    // - Run 6-10
    // - Run 11-100
    // - Run 101-1000
    // - Run 1001-10000
    // - Run 10001-100000
    // - Run 100001-1e6
    //
    // These different measurements should give insight into how the v8 optimization kicks in as
    // this becomes hotter.
    //
    // The entire measurement must be executed multiple times (including a full process restart) and
    // then combined.
    //
    // ## Second methodology:
    //
    // ```
    // const a = new BigDate();
    // const b = new BigDate();
    // return b.preciseTime().sub(b.preciseTime());
    // ```
    //
    // This methodology does not require measuring hrtime latency. All other steps are the same.
    //
    // Optimally you would collect data using both methodologies (in separate process starts).

    // FAST PATH START
    if (v === undefined) {
      const h = hrtime();
      const ref = new Date(); // For detecting clock jumps

      let ms = h[0] * 1e3 + floor(h[1] / 1e6);
      let ns = h[1] % 1e6;

      // Two component subtraction with manual overflow
      ms += _hrtimeOffset[0];
      ns += _hrtimeOffset[1];
      /* istanbul ignore next */
      if (ns > 1e6) {
        ms += 1;
        ns %= 1e6;
      }

      super(ms);
      this._frac = ns;

      // Detected clock jump! Need to recalculate offset
      /* istanbul ignore next */
      if (/* unlikely */ abs(ref.getTime() - this.getTime()) > 2.5) {
        // This code block is still optimized but no longer really part
        // of the fast path as this is only executed after a clock jump (admin
        // adjusts time/hibernation/suspend).
        _hrtimeOffset = _calcHrtimeOff();

        ms = h[0] * 1e3 + floor(h[1] / 1e6);
        ns = h[1] % 1e6;

        // Two component subtraction with manual overflow
        ms += _hrtimeOffset[0];
        ns += _hrtimeOffset[1];
        /* istanbul ignore next */
        if (ns > 1e6) {
          ms += 1;
          ns %= 1e6;
        }

        this.setTime(ms);
        this._frac = ns;
      }

      return;
    }
    // FAST PATH END

    super(0);
    if (arguments.length > 1) {
      // eslint-disable-next-line prefer-rest-params
      this._initComponents(...arguments);
    } else if (v instanceof Date) {
      // Converting to a string first because this will work even with
      // multiple instances of the BigDate type (package loaded multiple times).
      this._initString(v.toISOString());
    } else if (type(v) === String) {
      this._initString(v);
    } else {
      // We just assume this must be initialization from milliseconds
      // if it is not other mode of initialization. This approach also
      // allows for other instances of the Big type (same package loaded
      // multiple times)
      this._initMillis(v);
    }
  }

  /**
   * Convert the return value of `hrtime` to BigDate.
   *
   * See the caveats in the class documentation.
   *
   * @method
   * @param {Array|BigInt}
   */
  static fromHrtime(hr) {
    const r = new BigDate(); // Trigger a offset recalculation if necessary

    const off = Big(_hrtimeOffset[1]).mul(1e-6).plus(_hrtimeOffset[0]);
    /* istanbul ignore next */
    const ms = type(hr) !== Array
      ? Big(hr).mul(1e-6)
      : Big(hr[0] * 1e3).plus(Big(hr[1]).mul(1e-6));

    r.setPreciseTime(ms.plus(off));
    return r;
  }

  _initFields(date, frac) {
    this.setTime(date);
    this._frac = frac;
  }

  _initComponents(...args) {
    if (args.length < 7) {
      this._initDate(new Date(...args));
    } else {
      const ns = Big(args[6]).mul(1e6).mod(1e6);
      // eslint-disable-next-line no-param-reassign
      args[6] = Number(args[6]);
      this._initFields(new Date(...args), ns);
    }
  }

  _initDate(orig) {
    this._initFields(orig, 0);
  }

  _initMillis(ms) {
    this._initFields(
      new Date(Number(ms)),
      Big(ms).mul(1e6).mod(1e6),
    );
  }

  _initString(s) {
    const s_ = String(s);
    const d = new Date(s_);

    // Extract the number of seconds with decimal places;
    // this assumes the string is an ISO 8601 date with sub-seconds.
    // If the regexp search failed, = then we just use the date.
    const [_a, secLit] = s_.match(/:(\d{1,2}\.\d*)(Z|[+-]\d+)?$/) || [];
    /* istanbul ignore next */
    if (!secLit) {
      return this._initDate(d);
    }

    return this._initFields(d, Big(secLit).mul(1e9).mod(1e6));
  }

  /**
   * Get the Date as the epoch value. (Unix time/Number of seconds since 2019-01-01 UTC):
   * @method
   * @returns {Big} By returning a big decimal this can contain decimal places and support
   *   arbitrary precision.
   */
  preciseTime() {
    return Big(this._frac).mul(1e-6).plus(super.getTime());
  }

  /**
   * Set the date as the epoch value.
   *
   * @method
   * @param {Big}
   */
  setPreciseTime(n) {
    this._initMillis(n);
  }

  /**
   * Get the precise time from a Date or BigDate.
   *
   * @static
   * @returns {Big}
   */
  static preciseTime(d) {
    // Again, trying to stay compatible in the face of multiple instanciations
    // of this class again.
    return type(d.preciseTime) === Function
      ? Big(d.preciseTime())
      : Big(d.getTime());
  }

  /**
   * Convert the Date to ISO 8601 format.
   *
   * This changes the behaviour; in Date the number of decimal places
   * is limited to 3 and padded to 3 (milliseconds); in BigDecimal
   * the number of decimal places is unlimited and padded to 9 (nanoseconds).
   *
   * @method
   * @override
   * @returns {String}
   */
  toISOString() {
    const iso = super.toISOString();

    // Extract the decimals string from the precise time
    const decimals = String(this.preciseTime().mul(1e-3)).replace(/^[^.]+./, '');

    // Generate a padding (we want at least three decimal places)
    const pad = join('')(take(repeat('0'), max(0, 9 - size(decimals))));

    // Replace the decimal places in the iso string
    return iso.replace(/\.\d+/, `.${decimals}${pad}`);
  }

  toJSON() {
    return this.toISOString();
  }

  [inspect.custom](depth, opts) {
    const s = `${typename(type(this))} ${this.toISOString()}`;
    return opts.stylize(s, 'date');
  }

  [Equals.sym](otr) {
    return this.toISOString() === new BigDate(otr).toISOString();
  }

  [Deepclone.sym]() {
    return new BigDate(this);
  }

  [Shallowclone.sym]() {
    return new BigDate(this);
  }
}

module.exports = { BigDate };
