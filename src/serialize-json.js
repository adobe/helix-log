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
import { URL } from 'node:url';
import { type, typename } from './util.js';

export const JsonifyForLog = {
  sym: Symbol('JsonifyForLog'),
};

/**
 * jsonify the given data using the JsonifyForLog trait.
 *
 * Takes any javascript object and produces an object tree
 * that only contains json compatible objects (objects, arrays,
 * numbers, bools, strings and such).
 *
 * This is a no-op if the input is already json compatible.
 *
 * Note that this is specifically designed to serialize data for structured
 * logging. This is NOT suitable for proper serialization of json; specifically
 * this may lose information in cases where that makes sense.
 *
 * Features a default converter for any exception/subclass of Error.
 *
 * @function
 * @throws TraitNotImplemented If any object in the given object tree
 *   can not be converted to json-compatible
 * @param {*} what The object to convert
 * @returns {*} Json compatible object
 */
export const jsonifyForLog = (what) => {
  switch (type(what)) {
    case String:
    case Number:
    case Boolean:
    case undefined:
    case null:
      return what;
    case Object:
      return Object.fromEntries(Object.entries(what).map(([k, v]) => [k, jsonifyForLog(v)]));
    case Array:
      return what.map(jsonifyForLog);
    case Date:
      return what.toJSON();
    case URL:
      return what.toString();
    case Map:
      return {
        $type: 'Map',
        values: [...what.entries()].map(([k, v]) => [k, jsonifyForLog(v)]),
      };
    case Set:
      return {
        $type: 'Set',
        values: [...what.values()].map((v) => jsonifyForLog(v)),
      };
    default:
      if (type(what[JsonifyForLog.sym]) === Function) {
        return what[JsonifyForLog.sym]();
      }
      if (what instanceof Error || what === Error) {
        return {
          $type: typename(type(what)),
          name: what.name,
          message: what.message,
          stack: what.stack,
          code: what.code,
        };
      }
      if (type(what.toJSON) === Function) {
        return what.toJSON();
      } else {
        const o = jsonifyForLog(Object.fromEntries(Object.entries(what)));
        return { $type: typename(type(what)), ...o };
      }
  }
};
