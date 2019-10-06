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

/* eslint-disable global-require */

const { exec, isdef } = require('ferrum');
const pkgJson = require('../package.json');

module.exports = {
  ...require('./log'),
  ...require('./serialize-json'),
  ...require('./coralogix'),
  ...require('./logdna'),
  ...require('./bunyan'),
  ...require('./secret'),
  ...require('./recording'),
};

// Make this repo a singleton.

exec(() => {
  const key = 'helix-log-a8b81455-7074-4953-a769-82754b0eb756';
  const me = {
    module,
    package: pkgJson,
  };

  const subst = global[key];
  if (!isdef(subst)) {
    global[key] = me;
    return;
  }

  module.exports = subst.module.exports;
  module.exports.warn(
    'Multiple versions of adobe/helix-log in the same process! Using one loaded first!', {
      used: {
        version: subst.package.version,
        filename: subst.module.filename,
      },
      discarded: {
        version: me.package.version,
        filename: me.module.filename,
      },
    },
  );
});
