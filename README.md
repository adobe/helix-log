# Helix Log Framework

Logging framework used within the helix project.

## Status

[![codecov](https://img.shields.io/codecov/c/github/adobe/helix-log.svg)](https://codecov.io/gh/adobe/helix-log)
[![CircleCI](https://img.shields.io/circleci/project/github/adobe/helix-log.svg)](https://circleci.com/gh/adobe/helix-log)
[![GitHub license](https://img.shields.io/github/license/adobe/helix-log.svg)](https://github.com/adobe/helix-log/blob/master/LICENSE.txt)
[![GitHub issues](https://img.shields.io/github/issues/adobe/helix-log.svg)](https://github.com/adobe/helix-log/issues)
[![LGTM Code Quality Grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/adobe/helix-log.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/adobe/helix-log)

## Development


### Build

```bash
npm install
```

### Test

```bash
npm test
```

### Lint

```bash
npm run lint
```

# Usage

```
const { info, error } = require('@adobe/helix-log');

info('This is an info level message ', { foo: 42 }, '; dumping any javascript variable like console.log is supported');
error('You can log exceptions like this', new Error('This is a problem'));
```


# API Reference
## Classes

<dl>
<dt><a href="#Bunyan2HelixLog">Bunyan2HelixLog</a></dt>
<dd><p>Bunyan stream that can be used to forward any bunyan messages
to helix log.</p>
</dd>
<dt><a href="#CoralogixLogger">CoralogixLogger</a></dt>
<dd><p>Sends log messages to the coralogix logging service.</p>
</dd>
<dt><a href="#ConsoleLogger">ConsoleLogger</a></dt>
<dd><p>Logger that is especially designed to be used in node.js.</p>
<p>Print&#39;s to stderr; Marks errors, warns &amp; debug messages
with a colored <code>[ERROR]</code>/... prefix. Uses <code>inspect</code> to display
all non-strings.</p>
</dd>
<dt><a href="#MultiLogger">MultiLogger</a></dt>
<dd><p>Simple logger that forwards all messages to the underlying loggers.</p>
<p>This maintains an es6 map called loggers. Consumers of this API are
explicitly permitted to mutate this map or replace it all together in
order to add, remove or alter logger.</p>
</dd>
<dt><a href="#FileLogger">FileLogger</a></dt>
<dd><p>Logger specifically designed for logging to unix file descriptors.</p>
<p>This logger is synchronous: It uses blocking syscalls and thus guarantees
that all data is written even if process.exit() is called immediately after
logging.
For normal files this is not a problem as linux will never block when writing
to files, for sockets, pipes and ttys this might block the process for a considerable
time.</p>
</dd>
<dt><a href="#MemLogger">MemLogger</a></dt>
<dd><p>Logs messages to an in-memory buffer.</p>
</dd>
<dt><a href="#LogFacade">LogFacade</a></dt>
<dd><p>Log facade that simplifies logging to a logger.</p>
</dd>
<dt><a href="#LogdnaLogger">LogdnaLogger</a></dt>
<dd><p>Sends log messages to the logdna logging service.</p>
<p>Log messages are sent immediately.</p>
</dd>
</dl>

## Constants

<dl>
<dt><a href="#rootLogger">rootLogger</a></dt>
<dd><p>The logger all other loggers attach to.</p>
<p>Must always contain a logger named &#39;default&#39;; it is very much reccomended
that the default logger always be a console logger; this can serve as a good
fallback in case other loggers fail.</p>
<pre><code class="language-js">// Change the default logger
rootLogger.loggers.set(&#39;default&#39;, new ConsoleLogger({level: &#39;debug&#39;}));</code></pre>
<p>You should not log to the root logger directly; instead use one of the
wrapper functions <code>log, fatal, err, warn, info, verbose, debug</code>; they
perform some additional</p>
</dd>
<dt><a href="#rootFacade">rootFacade</a> : <code><a href="#LogFacade">LogFacade</a></code></dt>
<dd><p>The root log facade that logs to the rootLogger.</p>
</dd>
<dt><a href="#JsonifyForLog">JsonifyForLog</a></dt>
<dd><p>Trait used to serialize json objects to json. See jsonifyForLog.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#numericLogLevel">numericLogLevel(name)</a> ⇒ <code>number</code></dt>
<dd><p>This can be used to convert a string log level into it&#39;s
numeric equivalent. More pressing log levels have lower numbers.</p>
</dd>
<dt><a href="#tryInspect">tryInspect(what, opts)</a></dt>
<dd><p>Wrapper around inspect that is extremely robust against errors
during inspection.</p>
<p>Specifically designed to handle errors in toString() functions
and custom inspect functions.</p>
<p>If any error is encountered a less informative string than a full
inspect is returned and the error is logged using <code>err()</code>.</p>
</dd>
<dt><a href="#serializeMessage">serializeMessage(msg, opts)</a> ⇒ <code>string</code></dt>
<dd><p>This is a useful helper function that turns a message containing
arbitrary objects (like you would hand to console.log) into a string.</p>
<p>Leaves strings as is; uses <code>require(&#39;util&#39;).inspect(...)</code> on all other
types and joins the parameters using space:</p>
<p>Loggers writing to raw streams or to strings usually use this, however
not all loggers require this; e.g. in a browser environment
console.warn/log/error should be used as these enable the use of the
visual object inspectors, at least in chrome and firefox.</p>
</dd>
<dt><a href="#messageFormatSimple">messageFormatSimple(msg, opts)</a> : <code><a href="#MessageFormatter">MessageFormatter</a></code></dt>
<dd><p>Simple message format: Serializes the message and prefixes it with
the log level.</p>
<p>This is used by the MemLogger by default for instance, because it is relatively
easy to test with and contains no extra info.</p>
</dd>
<dt><a href="#messageFormatTechnical">messageFormatTechnical(msg, opts)</a> : <code><a href="#MessageFormatter">MessageFormatter</a></code></dt>
<dd><p>Message format that includes extra information; prefixes each messagej</p>
<p>This is used by FileLogger by default for instance because if you
work with many log files you need that sort of info.</p>
</dd>
<dt><a href="#messageFormatConsole">messageFormatConsole(msg, opts)</a> : <code><a href="#MessageFormatter">MessageFormatter</a></code></dt>
<dd><p>Message format with coloring/formatting escape codes</p>
<p>Designed for use in terminals.</p>
</dd>
<dt><a href="#messageFormatJson">messageFormatJson(msg, opts)</a> : <code><a href="#MessageFormatter">MessageFormatter</a></code></dt>
<dd><p>Message format that produces json.</p>
<p>Designed for structured logging; e.g. Loggly.</p>
<p>This produces an object that can be converted to JSON. It does not
produce a string, but you can easily write an adapter like so:</p>
<pre><code>const messageFormatJsonString = (...args) =&gt;
   JSON.stringify(messageFormatJson(...args));</code></pre><p>You can also wrap this to provide extra default fields:</p>
<pre><code>const messageFormatMyJson = (...args) =&gt; {
   pid: process.pid,
   ...JSON.stringify(messageFormatJson(...args)),
}</code></pre><p>If the last element in the message can be converted to json-like using
jsonifyForLog, then all the resulting fields will be included in the json-like
object generated.</p>
<p>The field <code>message</code> is reserved. The fields <code>level</code> and <code>timestamp</code> are filled with
default values.</p>
<p>If the last object is an exception, it will be sent as { exception: $exception };
this serves to facilitate searching for exceptions explicitly.</p>
</dd>
<dt><a href="#fatal">fatal(...msg)</a></dt>
<dd><p>Uses the currently installed logger to print a fatal error-message</p>
</dd>
<dt><a href="#error">error(...msg)</a></dt>
<dd><p>Uses the currently installed logger to print an error-message</p>
</dd>
<dt><a href="#warn">warn(...msg)</a></dt>
<dd><p>Uses the currently installed logger to print a warn message</p>
</dd>
<dt><a href="#log">log(...msg)</a></dt>
<dd><p>Uses the currently installed logger to print an informational message</p>
</dd>
<dt><a href="#verbose">verbose(...msg)</a></dt>
<dd><p>Uses the currently installed logger to print a verbose message</p>
</dd>
<dt><a href="#debug">debug(...msg)</a></dt>
<dd><p>Uses the currently installed logger to print a message intended for debugging</p>
</dd>
<dt><a href="#trace">trace(...msg)</a></dt>
<dd><p>Uses the currently installed logger to print a trace level message</p>
</dd>
<dt><a href="#silly">silly(...msg)</a></dt>
<dd><p>Uses the currently installed logger to print a silly level message</p>
</dd>
<dt><a href="#recordLogs">recordLogs(opts, fn)</a> ⇒ <code>string</code></dt>
<dd><p>Record the log files with debug granularity while the given function is running.</p>
<p>While the logger is recording, all other loggers are disabled.
If this is not your desired behaviour, you can use the MemLogger
manually.</p>
<pre><code>const { assertEquals } = require(&#39;ferrum&#39;);
const { recordLogs, info, err } = require(&#39;@adobe/helix-shared&#39;).log;

const logs = recordLogs(() =&gt; {
  info(&#39;Hello World\n&#39;);
  err(&#39;Nooo&#39;)
});
assertEquals(logs, &#39;Hello World\n[ERROR] Nooo&#39;);</code></pre></dd>
<dt><a href="#assertLogs">assertLogs(opts, fn, logs)</a></dt>
<dd><p>Assert that a piece of code produces a specific set of log messages.</p>
<pre><code>const { assertLogs, info, err } = require(&#39;@adobe/helix-shared&#39;).log;

assertLogs(() =&gt; {
  info(&#39;Hello World\n&#39;);
  err(&#39;Nooo&#39;)
}, multiline(`
  Hello World
  [ERROR] Nooo
`));</code></pre></dd>
<dt><a href="#recordAsyncLogs">recordAsyncLogs(opts, fn)</a> ⇒ <code>string</code></dt>
<dd><p>Async variant of recordLogs.</p>
<p>Note that using this is a bit dangerous;</p>
<pre><code>const { assertEquals } = require(&#39;ferrum&#39;);
const { recordAsyncLogs, info, err } = require(&#39;@adobe/helix-shared&#39;).log;

const logs = await recordLogs(async () =&gt; {
  info(&#39;Hello World\n&#39;);
  await sleep(500);
  err(&#39;Nooo&#39;)
});
assertEquals(logs, &#39;Hello World\n[ERROR] Nooo&#39;);</code></pre></dd>
<dt><a href="#assertAsyncLogs">assertAsyncLogs(opts, fn, logs)</a></dt>
<dd><p>Async variant of assertLogs</p>
<pre><code>const { assertAsyncLogs, info, err } = require(&#39;@adobe/helix-shared&#39;).log;

await assertAsyncLogs(() =&gt; {
  info(&#39;Hello World\n&#39;);
  await sleep(500);
  err(&#39;Nooo&#39;)
}, multiline(`
  Hello World
  [ERROR] Nooo
`));</code></pre></dd>
<dt><a href="#jsonifyForLog">jsonifyForLog(what)</a> ⇒ <code>*</code></dt>
<dd><p>jsonify the given data using the JsonifyForLog trait.</p>
<p>Takes any javascript object and produces an object tree
that only contains json compatible objects (objects, arrays,
numbers, bools, strings and such).</p>
<p>This is a no-op if the input is already json compatible.</p>
<p>Note that this is specifically designed to serialize data for structured
logging. This is NOT suitable for proper serialization of json; specifically
this may loose information in cases where that makes sense.</p>
<p>Features a default converter for any exception/subclass of Error.</p>
</dd>
</dl>

## Typedefs

<dl>
<dt><a href="#MessageFormatter">MessageFormatter</a> : <code>function</code></dt>
<dd></dd>
</dl>

## Interfaces

<dl>
<dt><a href="#Logger">Logger</a></dt>
<dd><p>Uses a fairly simple interface to avoid complexity for use cases in
which is not required. Can be used to dispatch logging to more
elaborate libraries. E.g. a logger using winston could be constructed like this:</p>
</dd>
</dl>

<a name="Logger"></a>

## Logger
Uses a fairly simple interface to avoid complexity for use cases in
which is not required. Can be used to dispatch logging to more
elaborate libraries. E.g. a logger using winston could be constructed like this:

**Kind**: global interface  
<a name="Logger+log"></a>

### logger.log(msg, opts)
Actually print a log message

Implementations of this MUST NOT throw exceptions. Instead implementors
ARE ADVISED to attempt to log the error using err() while employing some
means to avoid recursively triggering the error. Loggers SHOULD fall back
to logging with console.error.

Even though loggers MUST NOT throw exceptions; users of this method SHOULD
still catch any errors and handle them appropriately.

**Kind**: instance method of [<code>Logger</code>](#Logger)  

| Param | Type | Description |
| --- | --- | --- |
| msg | <code>Array</code> | The message; list of arguments as you would pass it to console.log |
| opts | <code>Object</code> | – Configuration object; contains only one key at   the moment: `level` - The log level which can be one of `error, warn,   info, verbose` and `debug`. |

<a name="Bunyan2HelixLog"></a>

## Bunyan2HelixLog
Bunyan stream that can be used to forward any bunyan messages
to helix log.

**Kind**: global class  
<a name="new_Bunyan2HelixLog_new"></a>

### new Bunyan2HelixLog(logger)

| Param | Type | Description |
| --- | --- | --- |
| logger | [<code>Logger</code>](#Logger) | – The helix-log logger to…well…log to.   If this is not given, the `rootLogger` will be used instead. |

**Example**  
```
const bunyan = require('bunyan');
const { Bunyan2HelixLog } = require('helix-log');

const logger = bunyan.createLogger({name: 'helixLogger'});
logger.addStream(Bunyan2HelixLog.createStream());
```

or

```
const logger = bunyan.createLogger({
   name: 'helixLogger',
   streams: [
     Bunyan2HelixLog.createStream()
   ],
});
```

which is really shorthand for:

```
const logger = bunyan.createLogger({
   name: 'helixLogger',
   streams: [
     {
       type: 'raw',
       stream: new Bunyan2HelixLog(rootLogger),
     };
   ],
});
```
<a name="CoralogixLogger"></a>

## CoralogixLogger
Sends log messages to the coralogix logging service.

**Kind**: global class  
**Implements**: [<code>Logger</code>](#Logger)  

* [CoralogixLogger](#CoralogixLogger)
    * [new CoralogixLogger(apikey, app, subsystem, opts)](#new_CoralogixLogger_new)
    * [.level](#CoralogixLogger+level) : <code>string</code>
    * [.formatter](#CoralogixLogger+formatter) : [<code>MessageFormatter</code>](#MessageFormatter)
    * [.fmtOpts](#CoralogixLogger+fmtOpts) : <code>object</code>
    * [.apikey](#CoralogixLogger+apikey) : <code>string</code>
    * [.app](#CoralogixLogger+app) : <code>string</code>
    * [.subsystem](#CoralogixLogger+subsystem) : <code>string</code>
    * [.host](#CoralogixLogger+host) : <code>string</code>
    * [.log(msg, opts)](#CoralogixLogger+log)

<a name="new_CoralogixLogger_new"></a>

### new CoralogixLogger(apikey, app, subsystem, opts)

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| apikey | <code>string</code> |  | – Your coralogix api key |
| app | <code>string</code> |  | – Name of the app under which the log messages should be categorized |
| subsystem | <code>string</code> |  | – Name of the subsystem under which   the log messages should be categorized |
| opts | <code>Object</code> |  | – Configuration object. Options are also forwarded to the formatter |
| [opts.level] | <code>string</code> | <code>&quot;silly&quot;</code> | The minimum log level to sent to coralogix |
| [opts.formatter] | [<code>MessageFormatter</code>](#MessageFormatter) | <code>messageFormatJson</code> | A formatter producing json |
| [opts.host] | <code>string</code> | <code>&quot;&lt;system hostname&gt;&quot;</code> | The hostname under which to categorize the messages |
| [opts.apiurl] | <code>string</code> | <code>&quot;https://api.coralogix.com/api/v1/&quot;</code> | where the coralogix api can be found |

<a name="CoralogixLogger+level"></a>

### coralogixLogger.level : <code>string</code>
The minimum log level for messages to be printed.
Feel free to change to one of the available levels.

**Kind**: instance property of [<code>CoralogixLogger</code>](#CoralogixLogger)  
<a name="CoralogixLogger+formatter"></a>

### coralogixLogger.formatter : [<code>MessageFormatter</code>](#MessageFormatter)
Formatter used to format all the messages.
Must yield an object suitable for passing to JSON.serialize

**Kind**: instance property of [<code>CoralogixLogger</code>](#CoralogixLogger)  
<a name="CoralogixLogger+fmtOpts"></a>

### coralogixLogger.fmtOpts : <code>object</code>
Options that will be passed to the formatter;
Feel free to mutate or exchange.

**Kind**: instance property of [<code>CoralogixLogger</code>](#CoralogixLogger)  
<a name="CoralogixLogger+apikey"></a>

### coralogixLogger.apikey : <code>string</code>
Name of the app under which the log messages should be categorized

**Kind**: instance property of [<code>CoralogixLogger</code>](#CoralogixLogger)  
<a name="CoralogixLogger+app"></a>

### coralogixLogger.app : <code>string</code>
Name of the app under which the log messages should be categorized

**Kind**: instance property of [<code>CoralogixLogger</code>](#CoralogixLogger)  
<a name="CoralogixLogger+subsystem"></a>

### coralogixLogger.subsystem : <code>string</code>
Name of the subsystem under which the log messages should be categorized

**Kind**: instance property of [<code>CoralogixLogger</code>](#CoralogixLogger)  
<a name="CoralogixLogger+host"></a>

### coralogixLogger.host : <code>string</code>
The hostname under which to categorize the messages

**Kind**: instance property of [<code>CoralogixLogger</code>](#CoralogixLogger)  
<a name="CoralogixLogger+log"></a>

### coralogixLogger.log(msg, opts)
Actually print a log message

Implementations of this MUST NOT throw exceptions. Instead implementors
ARE ADVISED to attempt to log the error using err() while employing some
means to avoid recursively triggering the error. Loggers SHOULD fall back
to logging with console.error.

Even though loggers MUST NOT throw exceptions; users of this method SHOULD
still catch any errors and handle them appropriately.

**Kind**: instance method of [<code>CoralogixLogger</code>](#CoralogixLogger)  
**Implements**: [<code>log</code>](#Logger+log)  

| Param | Type | Description |
| --- | --- | --- |
| msg | <code>Array</code> | The message; list of arguments as you would pass it to console.log |
| opts | <code>Object</code> | – Configuration object; contains only one key at   the moment: `level` - The log level which can be one of `error, warn,   info, verbose` and `debug`. |

<a name="ConsoleLogger"></a>

## ConsoleLogger
Logger that is especially designed to be used in node.js.

Print's to stderr; Marks errors, warns & debug messages
with a colored `[ERROR]`/... prefix. Uses `inspect` to display
all non-strings.

**Kind**: global class  
**Implements**: [<code>Logger</code>](#Logger)  

* [ConsoleLogger](#ConsoleLogger)
    * [new ConsoleLogger(opts)](#new_ConsoleLogger_new)
    * [.level](#ConsoleLogger+level) : <code>string</code>
    * [.formatter](#ConsoleLogger+formatter) : [<code>MessageFormatter</code>](#MessageFormatter)
    * [.fmtOpts](#ConsoleLogger+fmtOpts) : <code>object</code>
    * [.stream](#ConsoleLogger+stream) : <code>Writable</code>
    * [.log(msg, opts)](#ConsoleLogger+log)

<a name="new_ConsoleLogger_new"></a>

### new ConsoleLogger(opts)

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| opts | <code>Object</code> |  | – Configuration object. All other options are forwarded to the formatter. |
| [opts.level] | <code>string</code> | <code>&quot;info&quot;</code> | The minimum log level |
| [opts.stream] | <code>Writable</code> | <code>console._stderr</code> | A writable stream to log to. |
| [opts.formatter] | [<code>MessageFormatter</code>](#MessageFormatter) | <code>messageFormatConsole</code> | A formatter producing strings |

<a name="ConsoleLogger+level"></a>

### consoleLogger.level : <code>string</code>
The minimum log level for messages to be printed.
Feel free to change to one of the available levels.

**Kind**: instance property of [<code>ConsoleLogger</code>](#ConsoleLogger)  
<a name="ConsoleLogger+formatter"></a>

### consoleLogger.formatter : [<code>MessageFormatter</code>](#MessageFormatter)
Formatter used to format all the messages.
Must yield an object suitable for passing to JSON.serialize
Feel free to mutate or exchange.

**Kind**: instance property of [<code>ConsoleLogger</code>](#ConsoleLogger)  
<a name="ConsoleLogger+fmtOpts"></a>

### consoleLogger.fmtOpts : <code>object</code>
Options that will be passed to the formatter;
Feel free to mutate or exchange.

**Kind**: instance property of [<code>ConsoleLogger</code>](#ConsoleLogger)  
<a name="ConsoleLogger+stream"></a>

### consoleLogger.stream : <code>Writable</code>
Writable stream that is used to write the log messages to.

**Kind**: instance property of [<code>ConsoleLogger</code>](#ConsoleLogger)  
<a name="ConsoleLogger+log"></a>

### consoleLogger.log(msg, opts)
Actually print a log message

Implementations of this MUST NOT throw exceptions. Instead implementors
ARE ADVISED to attempt to log the error using err() while employing some
means to avoid recursively triggering the error. Loggers SHOULD fall back
to logging with console.error.

Even though loggers MUST NOT throw exceptions; users of this method SHOULD
still catch any errors and handle them appropriately.

**Kind**: instance method of [<code>ConsoleLogger</code>](#ConsoleLogger)  
**Implements**: [<code>log</code>](#Logger+log)  

| Param | Type | Description |
| --- | --- | --- |
| msg | <code>Array</code> | The message; list of arguments as you would pass it to console.log |
| opts | <code>Object</code> | – Configuration object; contains only one key at   the moment: `level` - The log level which can be one of `error, warn,   info, verbose` and `debug`. |

<a name="MultiLogger"></a>

## MultiLogger
Simple logger that forwards all messages to the underlying loggers.

This maintains an es6 map called loggers. Consumers of this API are
explicitly permitted to mutate this map or replace it all together in
order to add, remove or alter logger.

**Kind**: global class  
**Implements**: [<code>Logger</code>](#Logger)  

* [MultiLogger](#MultiLogger)
    * [.loggers](#MultiLogger+loggers) : [<code>Map.&lt;Logger&gt;</code>](#Logger)
    * [.log(msg, opts)](#MultiLogger+log)

<a name="MultiLogger+loggers"></a>

### multiLogger.loggers : [<code>Map.&lt;Logger&gt;</code>](#Logger)
The list of loggers this is forwarding to. Feel free to mutate
or replace.

**Kind**: instance property of [<code>MultiLogger</code>](#MultiLogger)  
<a name="MultiLogger+log"></a>

### multiLogger.log(msg, opts)
Actually print a log message

Implementations of this MUST NOT throw exceptions. Instead implementors
ARE ADVISED to attempt to log the error using err() while employing some
means to avoid recursively triggering the error. Loggers SHOULD fall back
to logging with console.error.

Even though loggers MUST NOT throw exceptions; users of this method SHOULD
still catch any errors and handle them appropriately.

**Kind**: instance method of [<code>MultiLogger</code>](#MultiLogger)  
**Implements**: [<code>log</code>](#Logger+log)  

| Param | Type | Description |
| --- | --- | --- |
| msg | <code>Array</code> | The message; list of arguments as you would pass it to console.log |
| opts | <code>Object</code> | – Configuration object; contains only one key at   the moment: `level` - The log level which can be one of `error, warn,   info, verbose` and `debug`. |

<a name="FileLogger"></a>

## FileLogger
Logger specifically designed for logging to unix file descriptors.

This logger is synchronous: It uses blocking syscalls and thus guarantees
that all data is written even if process.exit() is called immediately after
logging.
For normal files this is not a problem as linux will never block when writing
to files, for sockets, pipes and ttys this might block the process for a considerable
time.

**Kind**: global class  
**Implements**: [<code>Logger</code>](#Logger)  

* [FileLogger](#FileLogger)
    * [new FileLogger(name, opts)](#new_FileLogger_new)
    * [.fd](#FileLogger+fd) : <code>number</code>
    * [.level](#FileLogger+level) : <code>string</code>
    * [.formatter](#FileLogger+formatter) : [<code>MessageFormatter</code>](#MessageFormatter)
    * [.fmtOpts](#FileLogger+fmtOpts) : <code>object</code>
    * [.log(msg, opts)](#FileLogger+log)

<a name="new_FileLogger_new"></a>

### new FileLogger(name, opts)

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> \| <code>number</code> |  | The path of the file to log to   OR the unix file descriptor to log to. |
| opts | <code>Object</code> |  | – Configuration object. All other options are forwarded to the formatter. |
| [opts.level] | <code>string</code> | <code>&quot;info&quot;</code> | The minimum log level |
| [opts.formatter] | [<code>MessageFormatter</code>](#MessageFormatter) | <code>messageFormatTechnical</code> | A formatter producing strings |

<a name="FileLogger+fd"></a>

### fileLogger.fd : <code>number</code>
The underlying operating system file descriptor.

**Kind**: instance property of [<code>FileLogger</code>](#FileLogger)  
<a name="FileLogger+level"></a>

### fileLogger.level : <code>string</code>
The minimum log level for messages to be printed.
Feel free to change to one of the available levels.

**Kind**: instance property of [<code>FileLogger</code>](#FileLogger)  
<a name="FileLogger+formatter"></a>

### fileLogger.formatter : [<code>MessageFormatter</code>](#MessageFormatter)
Formatter used to format all the messages.
Must yield an object suitable for passing to JSON.serialize
Feel free to mutate or exchange.

**Kind**: instance property of [<code>FileLogger</code>](#FileLogger)  
<a name="FileLogger+fmtOpts"></a>

### fileLogger.fmtOpts : <code>object</code>
Options that will be passed to the formatter;
Feel free to mutate or exchange.

**Kind**: instance property of [<code>FileLogger</code>](#FileLogger)  
<a name="FileLogger+log"></a>

### fileLogger.log(msg, opts)
Actually print a log message

Implementations of this MUST NOT throw exceptions. Instead implementors
ARE ADVISED to attempt to log the error using err() while employing some
means to avoid recursively triggering the error. Loggers SHOULD fall back
to logging with console.error.

Even though loggers MUST NOT throw exceptions; users of this method SHOULD
still catch any errors and handle them appropriately.

**Kind**: instance method of [<code>FileLogger</code>](#FileLogger)  
**Implements**: [<code>log</code>](#Logger+log)  

| Param | Type | Description |
| --- | --- | --- |
| msg | <code>Array</code> | The message; list of arguments as you would pass it to console.log |
| opts | <code>Object</code> | – Configuration object; contains only one key at   the moment: `level` - The log level which can be one of `error, warn,   info, verbose` and `debug`. |

<a name="MemLogger"></a>

## MemLogger
Logs messages to an in-memory buffer.

**Kind**: global class  
**Implements**: [<code>Logger</code>](#Logger)  

* [MemLogger](#MemLogger)
    * [new MemLogger(opts)](#new_MemLogger_new)
    * [.buf](#MemLogger+buf) : <code>Array</code>
    * [.level](#MemLogger+level) : <code>string</code>
    * [.formatter](#MemLogger+formatter) : [<code>MessageFormatter</code>](#MessageFormatter)
    * [.fmtOpts](#MemLogger+fmtOpts) : <code>Object</code>
    * [.log(msg, opts)](#MemLogger+log)

<a name="new_MemLogger_new"></a>

### new MemLogger(opts)

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| opts | <code>Object</code> |  | – Configuration object. All other options are forwarded to the formatter. |
| [opts.level] | <code>string</code> | <code>&quot;info&quot;</code> | The minimum log level |
| [opts.formatter] | [<code>MessageFormatter</code>](#MessageFormatter) | <code>messageFormatSimple</code> | A formatter any format. |

<a name="MemLogger+buf"></a>

### memLogger.buf : <code>Array</code>
The buffer that stores all separate, formatted log messages.

**Kind**: instance property of [<code>MemLogger</code>](#MemLogger)  
<a name="MemLogger+level"></a>

### memLogger.level : <code>string</code>
The minimum log level for messages to be printed.
Feel free to change to one of the available levelsformatter

**Kind**: instance property of [<code>MemLogger</code>](#MemLogger)  
<a name="MemLogger+formatter"></a>

### memLogger.formatter : [<code>MessageFormatter</code>](#MessageFormatter)
Formatter used to format all the messages.
Must yield an object suitable for passing to JSON.serialize
Feel free to mutate or exchange.

**Kind**: instance property of [<code>MemLogger</code>](#MemLogger)  
<a name="MemLogger+fmtOpts"></a>

### memLogger.fmtOpts : <code>Object</code>
Options that will be passed to the formatter;
Feel free to mutate or exchange.

**Kind**: instance property of [<code>MemLogger</code>](#MemLogger)  
<a name="MemLogger+log"></a>

### memLogger.log(msg, opts)
Actually print a log message

Implementations of this MUST NOT throw exceptions. Instead implementors
ARE ADVISED to attempt to log the error using err() while employing some
means to avoid recursively triggering the error. Loggers SHOULD fall back
to logging with console.error.

Even though loggers MUST NOT throw exceptions; users of this method SHOULD
still catch any errors and handle them appropriately.

**Kind**: instance method of [<code>MemLogger</code>](#MemLogger)  
**Implements**: [<code>log</code>](#Logger+log)  

| Param | Type | Description |
| --- | --- | --- |
| msg | <code>Array</code> | The message; list of arguments as you would pass it to console.log |
| opts | <code>Object</code> | – Configuration object; contains only one key at   the moment: `level` - The log level which can be one of `error, warn,   info, verbose` and `debug`. |

<a name="LogFacade"></a>

## LogFacade
Log facade that simplifies logging to a logger.

**Kind**: global class  

* [LogFacade](#LogFacade)
    * [new LogFacade(logger, [fields])](#new_LogFacade_new)
    * [.data(fields)](#LogFacade+data) ⇒ [<code>LogFacade</code>](#LogFacade)
    * [.child([fields])](#LogFacade+child) ⇒ [<code>LogFacade</code>](#LogFacade)
    * [.logWithOpts(msg, opts)](#LogFacade+logWithOpts)
    * [.fatal(...msg)](#LogFacade+fatal)
    * [.error(...msg)](#LogFacade+error)
    * [.warn(...msg)](#LogFacade+warn)
    * [.info(...msg)](#LogFacade+info)
    * [.log(...msg)](#LogFacade+log)
    * [.verbose(...msg)](#LogFacade+verbose)
    * [.debug(...msg)](#LogFacade+debug)
    * [.trace(...msg)](#LogFacade+trace)
    * [.silly(...msg)](#LogFacade+silly)

<a name="new_LogFacade_new"></a>

### new LogFacade(logger, [fields])

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| logger | [<code>Logger</code>](#Logger) |  | the logger to forward logging |
| [fields] | <code>\*</code> | <code>{}</code> | optional data fields |

<a name="LogFacade+data"></a>

### logFacade.data(fields) ⇒ [<code>LogFacade</code>](#LogFacade)
Sets data on this log facade.

**Kind**: instance method of [<code>LogFacade</code>](#LogFacade)  
**Returns**: [<code>LogFacade</code>](#LogFacade) - this  

| Param | Type | Description |
| --- | --- | --- |
| fields | <code>\*</code> | any properties |

<a name="LogFacade+child"></a>

### logFacade.child([fields]) ⇒ [<code>LogFacade</code>](#LogFacade)
Creats a child log facade with bound data fields.

**Kind**: instance method of [<code>LogFacade</code>](#LogFacade)  
**Returns**: [<code>LogFacade</code>](#LogFacade) - - a new log facade  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [fields] | <code>\*</code> | <code>{}</code> | optional data fields |

<a name="LogFacade+logWithOpts"></a>

### logFacade.logWithOpts(msg, opts)
Log to the logger; this is a wrapper around `this.logger.log`
that handles exceptions thrown by logger.log.

**Kind**: instance method of [<code>LogFacade</code>](#LogFacade)  

| Param | Type | Description |
| --- | --- | --- |
| msg | <code>Array</code> | – The message as you would hand it to console.log |
| opts | <code>Object</code> | – Any options you would pass to rootLogger.log |

<a name="LogFacade+fatal"></a>

### logFacade.fatal(...msg)
Uses the currently installed logger to print a fatal error-message

**Kind**: instance method of [<code>LogFacade</code>](#LogFacade)  

| Param | Type | Description |
| --- | --- | --- |
| ...msg | <code>\*</code> | – The message as you would hand it to console.log |

<a name="LogFacade+error"></a>

### logFacade.error(...msg)
Uses the currently installed logger to print an error message

**Kind**: instance method of [<code>LogFacade</code>](#LogFacade)  

| Param | Type | Description |
| --- | --- | --- |
| ...msg | <code>\*</code> | – The message as you would hand it to console.log |

<a name="LogFacade+warn"></a>

### logFacade.warn(...msg)
Uses the currently installed logger to print a warn message

**Kind**: instance method of [<code>LogFacade</code>](#LogFacade)  

| Param | Type | Description |
| --- | --- | --- |
| ...msg | <code>\*</code> | – The message as you would hand it to console.log |

<a name="LogFacade+info"></a>

### logFacade.info(...msg)
Uses the currently installed logger to print an info message

**Kind**: instance method of [<code>LogFacade</code>](#LogFacade)  

| Param | Type | Description |
| --- | --- | --- |
| ...msg | <code>\*</code> | – The message as you would hand it to console.log |

<a name="LogFacade+log"></a>

### logFacade.log(...msg)
Uses the currently installed logger to print an info message

**Kind**: instance method of [<code>LogFacade</code>](#LogFacade)  

| Param | Type | Description |
| --- | --- | --- |
| ...msg | <code>\*</code> | – The message as you would hand it to console.log |

<a name="LogFacade+verbose"></a>

### logFacade.verbose(...msg)
Uses the currently installed logger to print a verbose message

**Kind**: instance method of [<code>LogFacade</code>](#LogFacade)  

| Param | Type | Description |
| --- | --- | --- |
| ...msg | <code>\*</code> | – The message as you would hand it to console.log |

<a name="LogFacade+debug"></a>

### logFacade.debug(...msg)
Uses the currently installed logger to print a debug message

**Kind**: instance method of [<code>LogFacade</code>](#LogFacade)  

| Param | Type | Description |
| --- | --- | --- |
| ...msg | <code>\*</code> | – The message as you would hand it to console.log |

<a name="LogFacade+trace"></a>

### logFacade.trace(...msg)
Uses the currently installed logger to print a trace message

**Kind**: instance method of [<code>LogFacade</code>](#LogFacade)  

| Param | Type | Description |
| --- | --- | --- |
| ...msg | <code>\*</code> | – The message as you would hand it to console.log |

<a name="LogFacade+silly"></a>

### logFacade.silly(...msg)
Uses the currently installed logger to print a silly message

**Kind**: instance method of [<code>LogFacade</code>](#LogFacade)  

| Param | Type | Description |
| --- | --- | --- |
| ...msg | <code>\*</code> | – The message as you would hand it to console.log |

<a name="LogdnaLogger"></a>

## LogdnaLogger
Sends log messages to the logdna logging service.

Log messages are sent immediately.

**Kind**: global class  
**Implements**: [<code>Logger</code>](#Logger)  

* [LogdnaLogger](#LogdnaLogger)
    * [new LogdnaLogger(apikey, app, file, opts)](#new_LogdnaLogger_new)
    * [.level](#LogdnaLogger+level) : <code>string</code>
    * [.formatter](#LogdnaLogger+formatter) : <code>function</code>
    * [.fmtOpts](#LogdnaLogger+fmtOpts) : <code>object</code>
    * [.apikey](#LogdnaLogger+apikey) : <code>String</code>
    * [.app](#LogdnaLogger+app) : <code>String</code>
    * [.host](#LogdnaLogger+host) : <code>String</code>
    * [.apiurl](#LogdnaLogger+apiurl) : <code>String</code>
    * [.log(msg, opts)](#LogdnaLogger+log)

<a name="new_LogdnaLogger_new"></a>

### new LogdnaLogger(apikey, app, file, opts)

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| apikey | <code>string</code> |  | – Your logdna api key |
| app | <code>string</code> |  | – Name of the app under which the log messages should be categorized |
| file | <code>string</code> |  | – Name of the file / subsystem under which   the log messages should be categorized |
| opts | <code>Object</code> |  | – Configuration object. Options are also forwarded to the formatter |
| [opts.level] | <code>string</code> | <code>&quot;silly&quot;</code> | The minimum log level to sent to logdna |
| [opts.formatter] | [<code>MessageFormatter</code>](#MessageFormatter) | <code>messageFormatJson</code> | A formatter producing json |
| [opts.host] | <code>string</code> | <code>&quot;&lt;system hostname&gt;&quot;</code> | The hostname under which to categorize the messages |
| [opts.apiurl] | <code>string</code> | <code>&quot;https://logs.logdna.com&quot;</code> | where the logdna api is hosted. |

<a name="LogdnaLogger+level"></a>

### logdnaLogger.level : <code>string</code>
The minimum log level for messages to be printed.
Feel free to change to one of the available levels.

**Kind**: instance property of [<code>LogdnaLogger</code>](#LogdnaLogger)  
<a name="LogdnaLogger+formatter"></a>

### logdnaLogger.formatter : <code>function</code>
Formatter used to format all the messages.
Must yield an object suitable for passing to JSON.serialize

**Kind**: instance property of [<code>LogdnaLogger</code>](#LogdnaLogger)  
<a name="LogdnaLogger+fmtOpts"></a>

### logdnaLogger.fmtOpts : <code>object</code>
Options that will be passed to the formatter;
Feel free to mutate or exchange.

**Kind**: instance property of [<code>LogdnaLogger</code>](#LogdnaLogger)  
<a name="LogdnaLogger+apikey"></a>

### logdnaLogger.apikey : <code>String</code>
Name of the app under which the log messages should be categorized

**Kind**: instance property of [<code>LogdnaLogger</code>](#LogdnaLogger)  
<a name="LogdnaLogger+app"></a>

### logdnaLogger.app : <code>String</code>
Name of the app under which the log messages should be categorized

**Kind**: instance property of [<code>LogdnaLogger</code>](#LogdnaLogger)  
<a name="LogdnaLogger+host"></a>

### logdnaLogger.host : <code>String</code>
The hostname under which to categorize the messages

**Kind**: instance property of [<code>LogdnaLogger</code>](#LogdnaLogger)  
<a name="LogdnaLogger+apiurl"></a>

### logdnaLogger.apiurl : <code>String</code>
The url under which the logdna api is hosted.

**Kind**: instance property of [<code>LogdnaLogger</code>](#LogdnaLogger)  
<a name="LogdnaLogger+log"></a>

### logdnaLogger.log(msg, opts)
Actually print a log message

Implementations of this MUST NOT throw exceptions. Instead implementors
ARE ADVISED to attempt to log the error using err() while employing some
means to avoid recursively triggering the error. Loggers SHOULD fall back
to logging with console.error.

Even though loggers MUST NOT throw exceptions; users of this method SHOULD
still catch any errors and handle them appropriately.

**Kind**: instance method of [<code>LogdnaLogger</code>](#LogdnaLogger)  
**Implements**: [<code>log</code>](#Logger+log)  

| Param | Type | Description |
| --- | --- | --- |
| msg | <code>Array</code> | The message; list of arguments as you would pass it to console.log |
| opts | <code>Object</code> | – Configuration object; contains only one key at   the moment: `level` - The log level which can be one of `error, warn,   info, verbose` and `debug`. |

<a name="rootLogger"></a>

## rootLogger
The logger all other loggers attach to.

Must always contain a logger named 'default'; it is very much reccomended
that the default logger always be a console logger; this can serve as a good
fallback in case other loggers fail.

```js
// Change the default logger
rootLogger.loggers.set('default', new ConsoleLogger({level: 'debug'}));
```

You should not log to the root logger directly; instead use one of the
wrapper functions `log, fatal, err, warn, info, verbose, debug`; they
perform some additional

**Kind**: global constant  
<a name="rootFacade"></a>

## rootFacade : [<code>LogFacade</code>](#LogFacade)
The root log facade that logs to the rootLogger.

**Kind**: global constant  
<a name="JsonifyForLog"></a>

## JsonifyForLog
Trait used to serialize json objects to json. See jsonifyForLog.

**Kind**: global constant  
<a name="numericLogLevel"></a>

## numericLogLevel(name) ⇒ <code>number</code>
This can be used to convert a string log level into it's
numeric equivalent. More pressing log levels have lower numbers.

**Kind**: global function  
**Returns**: <code>number</code> - The numeric log level  
**Throws**:

- <code>Error</code> If the given log level name is invalid.


| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | Name of the log level |

<a name="tryInspect"></a>

## tryInspect(what, opts)
Wrapper around inspect that is extremely robust against errors
during inspection.

Specifically designed to handle errors in toString() functions
and custom inspect functions.

If any error is encountered a less informative string than a full
inspect is returned and the error is logged using `err()`.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| what | <code>\*</code> | The object to inspect |
| opts | <code>Object</code> | Options will be passed through to inspect.   Note that these may be ignored if there is an error during inspect(). |

<a name="serializeMessage"></a>

## serializeMessage(msg, opts) ⇒ <code>string</code>
This is a useful helper function that turns a message containing
arbitrary objects (like you would hand to console.log) into a string.

Leaves strings as is; uses `require('util').inspect(...)` on all other
types and joins the parameters using space:

Loggers writing to raw streams or to strings usually use this, however
not all loggers require this; e.g. in a browser environment
console.warn/log/error should be used as these enable the use of the
visual object inspectors, at least in chrome and firefox.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| msg | <code>Array</code> | – Parameters as you would pass them to console.log |
| opts | <code>Object</code> | – Parameters are forwarded to util.inspect().   By default `{depth: null, breakLength: Infinity, colors: false}` is used. |

<a name="messageFormatSimple"></a>

## messageFormatSimple(msg, opts) : [<code>MessageFormatter</code>](#MessageFormatter)
Simple message format: Serializes the message and prefixes it with
the log level.

This is used by the MemLogger by default for instance, because it is relatively
easy to test with and contains no extra info.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| msg | <code>Array</code> | – Parameters as you would pass them to console.log |
| opts | <code>Object</code> | – Parameters are forwarded to serializeMessage; other than that:   - level: one of the log levels; this parameter is required. |

<a name="messageFormatTechnical"></a>

## messageFormatTechnical(msg, opts) : [<code>MessageFormatter</code>](#MessageFormatter)
Message format that includes extra information; prefixes each messagej

This is used by FileLogger by default for instance because if you
work with many log files you need that sort of info.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| msg | <code>Array</code> | – Parameters as you would pass them to console.log |
| opts | <code>Object</code> | – Parameters are forwarded to serializeMessage; other than that:   - level: one of the log levels; this parameter is required. |

<a name="messageFormatConsole"></a>

## messageFormatConsole(msg, opts) : [<code>MessageFormatter</code>](#MessageFormatter)
Message format with coloring/formatting escape codes

Designed for use in terminals.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| msg | <code>Array</code> | – Parameters as you would pass them to console.log |
| opts | <code>Object</code> | – Parameters are forwarded to serializeMessage; other than that:   - level: one of the log levels; this parameter is required. |

<a name="messageFormatJson"></a>

## messageFormatJson(msg, opts) : [<code>MessageFormatter</code>](#MessageFormatter)
Message format that produces json.

Designed for structured logging; e.g. Loggly.

This produces an object that can be converted to JSON. It does not
produce a string, but you can easily write an adapter like so:

```
const messageFormatJsonString = (...args) =>
   JSON.stringify(messageFormatJson(...args));
```

You can also wrap this to provide extra default fields:

```
const messageFormatMyJson = (...args) => {
   pid: process.pid,
   ...JSON.stringify(messageFormatJson(...args)),
}
```

If the last element in the message can be converted to json-like using
jsonifyForLog, then all the resulting fields will be included in the json-like
object generated.

The field `message` is reserved. The fields `level` and `timestamp` are filled with
default values.

If the last object is an exception, it will be sent as { exception: $exception };
this serves to facilitate searching for exceptions explicitly.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| msg | <code>Array</code> | – Parameters as you would pass them to console.log |
| opts | <code>Object</code> | – Parameters are forwarded to serializeMessage; other than that:   - level: one of the log levels; this parameter is required. |

<a name="fatal"></a>

## fatal(...msg)
Uses the currently installed logger to print a fatal error-message

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| ...msg | <code>\*</code> | – The message as you would hand it to console.log |

<a name="error"></a>

## error(...msg)
Uses the currently installed logger to print an error-message

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| ...msg | <code>\*</code> | – The message as you would hand it to console.log |

<a name="warn"></a>

## warn(...msg)
Uses the currently installed logger to print a warn message

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| ...msg | <code>\*</code> | – The message as you would hand it to console.log |

<a name="log"></a>

## log(...msg)
Uses the currently installed logger to print an informational message

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| ...msg | <code>\*</code> | – The message as you would hand it to console.log |

<a name="verbose"></a>

## verbose(...msg)
Uses the currently installed logger to print a verbose message

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| ...msg | <code>\*</code> | – The message as you would hand it to console.log |

<a name="debug"></a>

## debug(...msg)
Uses the currently installed logger to print a message intended for debugging

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| ...msg | <code>\*</code> | – The message as you would hand it to console.log |

<a name="trace"></a>

## trace(...msg)
Uses the currently installed logger to print a trace level message

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| ...msg | <code>\*</code> | – The message as you would hand it to console.log |

<a name="silly"></a>

## silly(...msg)
Uses the currently installed logger to print a silly level message

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| ...msg | <code>\*</code> | – The message as you would hand it to console.log |

<a name="recordLogs"></a>

## recordLogs(opts, fn) ⇒ <code>string</code>
Record the log files with debug granularity while the given function is running.

While the logger is recording, all other loggers are disabled.
If this is not your desired behaviour, you can use the MemLogger
manually.

```
const { assertEquals } = require('ferrum');
const { recordLogs, info, err } = require('@adobe/helix-shared').log;

const logs = recordLogs(() => {
  info('Hello World\n');
  err('Nooo')
});
assertEquals(logs, 'Hello World\n[ERROR] Nooo');
```

**Kind**: global function  
**Returns**: <code>string</code> - The logs that where produced by the codee  

| Param | Type | Description |
| --- | --- | --- |
| opts | <code>Object</code> | – optional first parameter; options passed to MemLogger |
| fn | <code>function</code> | The logs that this code emits will be recorded. |

<a name="assertLogs"></a>

## assertLogs(opts, fn, logs)
Assert that a piece of code produces a specific set of log messages.

```
const { assertLogs, info, err } = require('@adobe/helix-shared').log;

assertLogs(() => {
  info('Hello World\n');
  err('Nooo')
}, multiline(`
  Hello World
  [ERROR] Nooo
`));
```

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| opts | <code>Object</code> | – optional first parameter; options passed to MemLogger |
| fn | <code>function</code> | The logs that this code emits will be recorded. |
| logs | <code>string</code> |  |

<a name="recordAsyncLogs"></a>

## recordAsyncLogs(opts, fn) ⇒ <code>string</code>
Async variant of recordLogs.

Note that using this is a bit dangerous;

```
const { assertEquals } = require('ferrum');
const { recordAsyncLogs, info, err } = require('@adobe/helix-shared').log;

const logs = await recordLogs(async () => {
  info('Hello World\n');
  await sleep(500);
  err('Nooo')
});
assertEquals(logs, 'Hello World\n[ERROR] Nooo');
```

**Kind**: global function  
**Returns**: <code>string</code> - The logs that where produced by the codee  

| Param | Type | Description |
| --- | --- | --- |
| opts | <code>Object</code> | – optional first parameter; options passed to MemLogger |
| fn | <code>function</code> | The logs that this code emits will be recorded. |

<a name="assertAsyncLogs"></a>

## assertAsyncLogs(opts, fn, logs)
Async variant of assertLogs

```
const { assertAsyncLogs, info, err } = require('@adobe/helix-shared').log;

await assertAsyncLogs(() => {
  info('Hello World\n');
  await sleep(500);
  err('Nooo')
}, multiline(`
  Hello World
  [ERROR] Nooo
`));
```

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| opts | <code>Object</code> | – optional first parameter; options passed to MemLogger |
| fn | <code>function</code> | The logs that this code emits will be recorded. |
| logs | <code>string</code> |  |

<a name="jsonifyForLog"></a>

## jsonifyForLog(what) ⇒ <code>\*</code>
jsonify the given data using the JsonifyForLog trait.

Takes any javascript object and produces an object tree
that only contains json compatible objects (objects, arrays,
numbers, bools, strings and such).

This is a no-op if the input is already json compatible.

Note that this is specifically designed to serialize data for structured
logging. This is NOT suitable for proper serialization of json; specifically
this may loose information in cases where that makes sense.

Features a default converter for any exception/subclass of Error.

**Kind**: global function  
**Returns**: <code>\*</code> - Json compatible object  
**Throws**:

- TraitNotImplemented If any object in the given object tree
  can not be converted to json-compatible


| Param | Type | Description |
| --- | --- | --- |
| what | <code>\*</code> | The object to convert |

<a name="MessageFormatter"></a>

## MessageFormatter : <code>function</code>
**Kind**: global typedef  

| Param | Type | Description |
| --- | --- | --- |
| msg | <code>Array</code> | – Parameters as you would pass them to console.log |
| opts | <code>Object</code> | – Formatting options. |

