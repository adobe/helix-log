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
const { type } = require('ferrum');
const { inspect } = require('util');

/**
 * Special wrapper that should be used to protect secret values.
 *
 * Effectively this tries to hide the actual payload so that the
 * secret has to be explicitly extracted before using it.
 *
 * ```
 * const mySecret = new Secret(42); // Create a secret
 * mySecret.value; // => 42; extract the value
 * mySecret.value = 64; // assign a new value
 * ```
 *
 * The secret can only be accessed through the .secret property
 * in order to make sure that the access is not accidental;
 * the secret property cannot be iterated over and the secret will
 * not be leaked when converted to json or when printed.
 *
 * @example
 * ```
 * > mySecret
 * [Hidden Secret]
 * > console.log(mySecret)
 * [Hidden Secret]
 * undefined
 * > `${mySecret}`
 * '[Hidden Secret]'
 * > JSON.stringify(mySecret)
 * '{}'
 * > Object.keys(mySecret)
 * []
 * ```
 *
 * @class
 */
class Secret {
  constructor(value) {
    this._set(value);
  }

  _set(value) {
    Object.defineProperty(this, 'secret', {
      enumerable: false,
      configurable: true,
      get: type(value) === Secret ? (() => value.secret) : (() => value),
      set: (v) => {
        this._set(v);
      },
    });
  }

  [inspect.custom]() {
    return '[Hidden Secret]';
  }

  toString() {
    return '[Hidden Secret]';
  }
}

module.exports = { Secret };
