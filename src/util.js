/*
 * Copyright 2025 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
export const isdef = (v) => v !== undefined && v !== null;

export const type = (v) => (isdef(v) ? v.constructor : v);

export const typename = (t) => (isdef(t) ? t.name : `${t}`);

export const empty = (t) => (Array.isArray(t) ? t.length === 0 : Object.entries(t).length === 0);

export const identity = (a) => a;
