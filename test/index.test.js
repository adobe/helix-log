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
/* eslint-disable global-require */

const assert = require('assert');
const { readFileSync } = require('fs');

it('singleton expule', () => {
  const key = 'helix-log-a8b81455-7074-4953-a769-82754b0eb756';
  const exp = require('../src/index');
  const mod = require.cache[require.resolve('../src/index')];
  const expLog = require('../src/log');
  assert.strictEqual(exp, global[key].module.exports);
  assert(exp.ConsoleLogger === expLog.ConsoleLogger);


  // Delete from cache; should return same expule despite deletion
  const logged = exp.recordLogs(() => {
    delete require.cache[require.resolve('../src/index')];
    delete require.cache[require.resolve('../src/log')];
    const exp2 = require('../src/index');
    assert.strictEqual(exp, exp2);
    const mod2 = require.cache[require.resolve('../src/index')];
    assert(mod !== mod2);
    const expLog2 = require('../src/log');
    assert(expLog !== expLog2);
    assert(exp.ConsoleLogger === exp2.ConsoleLogger);
    assert(exp2.ConsoleLogger !== expLog2.ConsoleLogger);
  });

  const pack = JSON.parse(readFileSync(`${__dirname}/../package.json`, { encoding: 'utf-8' }));
  const idxFile = require.resolve('../src/index');

  const expectLog = '[WARN] Multiple versions of adobe/helix-log in the same process! '
    + 'Using one loaded first! '
    + `{ used: { version: '${pack.version}', filename: '${idxFile}' }, `
    + `discarded: { version: '${pack.version}', filename: '${idxFile}' } }\n`;
  assert.strictEqual(logged, expectLog);
});
