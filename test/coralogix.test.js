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
const { CoralogixLogger } = require('../src');

it('CoralogixLogger', async () => {
  // We're just testing here whether the logger can be created…not actually
  // logging something as coralogix-node doesn't support specifying an alternate
  // host.
  // Not an actual private key, just a randomly generated UUID used for nothing…
  const _logger = new CoralogixLogger('e51afea1-f549-423a-8e59-6175a2daadf4', 'helix-log', 'testing');
});
