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

const { Trait, list, map, obj, identity, type, typename } = require('ferrum');

const jsonifyForLog = (what) => JsonifyForLog.invoke(what);

const JsonifyForLog = new Trait('JsonifyForLog');
JsonifyForLog.impl(String, identity);
JsonifyForLog.impl(Number, identity);
JsonifyForLog.impl(Boolean, identity);
JsonifyForLog.impl(null, identity);
JsonifyForLog.impl(Object, (what) => obj(map(what, map(jsonifyForLog))));
JsonifyForLog.impl(Array, (what) => list(map(what, jsonifyForLog)));
JsonifyForLog.impl(Map, (what) => ({
  '$type': 'Map',
  'values': list(map(map(jsonifyForLog), what))
}));
JsonifyForLog.impl(Set, (what) => ({
  '$type': 'Set',
  'values': list(map(jsonifyForLog, what))
}));
JsonifyForLog.implWild((wild) => {
  // issubclass
  if (wild.prototype instanceof Error || wild === Error) {
    return (what) => ({
      '$class': typename(type(what)),
      'name': what.name,
      'message': what.message,
      'stack': what.stack
    });
  }
  return undefined;
});

module.exports = { jsonifyForLog, JsonifyForLog };
