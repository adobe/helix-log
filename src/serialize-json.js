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

/* eslint-disable no-use-before-define */
const { URL } = require('url');
const {
  isdef, Trait, list, map, obj, identity, type, typename,
} = require('ferrum');

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
 * this may loose information in cases where that makes sense.
 *
 * Features a default converter for any exception/subclass of Error.
 *
 * @function
 * @throws TraitNotImplemented If any object in the given object tree
 *   can not be converted to json-compatible
 * @param {*} what The object to convert
 * @returns {*} Json compatible object
 */
const jsonifyForLog = (what) => JsonifyForLog.invoke(what);

/**
 * Trait used to serialize json objects to json. See jsonifyForLog.
 */
const JsonifyForLog = new Trait('JsonifyForLog');
JsonifyForLog.impl(undefined, identity);
JsonifyForLog.impl(String, identity);
JsonifyForLog.impl(Number, identity);
JsonifyForLog.impl(Boolean, identity);
JsonifyForLog.impl(null, identity);
JsonifyForLog.impl(Object, (what) => obj(map(what, map(jsonifyForLog))));
JsonifyForLog.impl(Array, (what) => list(map(what, jsonifyForLog)));
JsonifyForLog.impl(Date, (what) => what.toJSON());
JsonifyForLog.impl(URL, (what) => what.toString());
JsonifyForLog.impl(Map, (what) => ({
  $type: 'Map',
  values: list(map(what, (inn) => list(map(inn, jsonifyForLog)))),
}));
JsonifyForLog.impl(Set, (what) => ({
  $type: 'Set',
  values: list(map(what, jsonifyForLog)),
}));
JsonifyForLog.implWild((wild) => {
  // issubclass
  if (isdef(wild) && (wild.prototype instanceof Error || wild === Error)) {
    return (what) => ({
      $type: typename(type(what)),
      name: what.name,
      message: what.message,
      stack: what.stack,
      code: what.code,
    });
  }
  return undefined;
});
// Fallback exporter
JsonifyForLog.implWild(() => (what) => {
  if (type(what.toJSON) === Function) {
    return what.toJSON();
  } else {
    const o = jsonifyForLog(obj(Object.entries(what)));
    return { $type: typename(type(what)), ...o };
  }
});

module.exports = { jsonifyForLog, JsonifyForLog };
