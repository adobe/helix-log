## [6.0.3](https://github.com/adobe/helix-log/compare/v6.0.2...v6.0.3) (2024-04-13)


### Bug Fixes

* **deps:** update external fixes ([f0ddce9](https://github.com/adobe/helix-log/commit/f0ddce9011a5eb54cc753c3ca5bf5512e859e611))

## [6.0.2](https://github.com/adobe/helix-log/compare/v6.0.1...v6.0.2) (2024-04-09)


### Bug Fixes

* **deps:** update external major (major) ([#339](https://github.com/adobe/helix-log/issues/339)) ([460f67f](https://github.com/adobe/helix-log/commit/460f67f87971e62597c3ab4a80b8959907ae1b5c))

## [6.0.1](https://github.com/adobe/helix-log/compare/v6.0.0...v6.0.1) (2023-10-24)


### Bug Fixes

* **deps:** update external fixes ([210c340](https://github.com/adobe/helix-log/commit/210c340732928bccb110d16256e871c261171ab9))

# [6.0.0](https://github.com/adobe/helix-log/compare/v5.0.5...v6.0.0) (2021-10-20)


### Bug Fixes

* remove global root logger and related methods ([cbc5135](https://github.com/adobe/helix-log/commit/cbc5135c494a679895f07882d40b5d3dedbf14f9))
* remove winston support ([bf9053a](https://github.com/adobe/helix-log/commit/bf9053af8c6128473b17d3f7652d4630c4036ba2))


### BREAKING CHANGES

* the following constants and methods are no longer
  exported:
  - rootLogger
  - fatal
  - error
  - info
  - log
  - warn
  - verbose
  - debug
  - trace
  - silly

In order to quickly get a root logger, use `createDefaultLogger()`.
* the winston transport is no longer supported

## [5.0.5](https://github.com/adobe/helix-log/compare/v5.0.4...v5.0.5) (2021-09-20)


### Bug Fixes

* update ferrum et al ([a397c01](https://github.com/adobe/helix-log/commit/a397c01b4e44f457afdf1906b8adad97d756a7cd))

## [5.0.4](https://github.com/adobe/helix-log/compare/v5.0.3...v5.0.4) (2021-09-02)


### Bug Fixes

* add timeout of 5s for sending logs to coralogix ([#221](https://github.com/adobe/helix-log/issues/221)) ([36b4ae2](https://github.com/adobe/helix-log/commit/36b4ae2a27b13a84124eeeb1c77ee113342d7ff8)), closes [#196](https://github.com/adobe/helix-log/issues/196)

## [5.0.3](https://github.com/adobe/helix-log/compare/v5.0.2...v5.0.3) (2021-04-12)


### Bug Fixes

* **coralogix:** fix promise rejection warning ([#185](https://github.com/adobe/helix-log/issues/185)) ([98cacff](https://github.com/adobe/helix-log/commit/98cacff1f89cf5f449ea7f6a41341f509087b9fa))

## [5.0.2](https://github.com/adobe/helix-log/compare/v5.0.1...v5.0.2) (2021-04-02)


### Bug Fixes

* **deps:** npm audit fix ([2bb15b7](https://github.com/adobe/helix-log/commit/2bb15b79ddd8d29a09efd56d2b913e97acfce97c))

## [5.0.1](https://github.com/adobe/helix-log/compare/v5.0.0...v5.0.1) (2021-04-02)


### Bug Fixes

* **coralogix:** never throw an exception when flushing fails, just log an error to console ([7b58313](https://github.com/adobe/helix-log/commit/7b583137cbd77de3788677fbdae0dda67f8a6d83)), closes [#181](https://github.com/adobe/helix-log/issues/181)

# [5.0.0](https://github.com/adobe/helix-log/compare/v4.5.3...v5.0.0) (2021-02-25)


### Features

* **log:** add flush() ([af72e3a](https://github.com/adobe/helix-log/commit/af72e3a785f51bc4b2e2c558e47a151f06cb488f))


### BREAKING CHANGES

* **log:** New method: Logger.flush() added

Loggers now need to implement a 'flush()' method or extend from
LoggerBase which already provides a stub.

## [4.5.3](https://github.com/adobe/helix-log/compare/v4.5.2...v4.5.3) (2020-11-18)


### Bug Fixes

* catch errors thrown by BigDate parsing ([#156](https://github.com/adobe/helix-log/issues/156)) ([7ae4e8b](https://github.com/adobe/helix-log/commit/7ae4e8b78ca30ba3e23b826ee98dfdcf6e9d96dd))

## [4.5.2](https://github.com/adobe/helix-log/compare/v4.5.1...v4.5.2) (2020-09-29)


### Bug Fixes

* **deps:** update external major ([#146](https://github.com/adobe/helix-log/issues/146)) ([1bed044](https://github.com/adobe/helix-log/commit/1bed044ec1a13df65318de8ae4b88080e7c5730b))

## [4.5.1](https://github.com/adobe/helix-log/compare/v4.5.0...v4.5.1) (2020-02-25)


### Bug Fixes

* **deps:** update dependency uuid to v7 ([#102](https://github.com/adobe/helix-log/issues/102)) ([d4c8aa7](https://github.com/adobe/helix-log/commit/d4c8aa7268e3e8652511d734dd91ce907e11bebb))

# [4.5.0](https://github.com/adobe/helix-log/compare/v4.4.2...v4.5.0) (2020-01-22)


### Features

* **coralogix:** use connection pool ([#93](https://github.com/adobe/helix-log/issues/93)) ([f8cb543](https://github.com/adobe/helix-log/commit/f8cb543ce17136566784a981d7cf576a6481b6cd))

## [4.4.2](https://github.com/adobe/helix-log/compare/v4.4.1...v4.4.2) (2020-01-09)


### Bug Fixes

* **log:** ensure that filter can operate on default fields ([#86](https://github.com/adobe/helix-log/issues/86)) ([fe5a2b8](https://github.com/adobe/helix-log/commit/fe5a2b8a6aa9fde077244e9f8570588732b9b3c3)), closes [#85](https://github.com/adobe/helix-log/issues/85)

## [4.4.1](https://github.com/adobe/helix-log/compare/v4.4.0...v4.4.1) (2019-12-18)


### Bug Fixes

* **deps:** remove snyk as we use tidelift now ([#82](https://github.com/adobe/helix-log/issues/82)) ([3f96ec9](https://github.com/adobe/helix-log/commit/3f96ec9260c871642657ccd2b76d0521d1b4e011))

# [4.4.0](https://github.com/adobe/helix-log/compare/v4.3.0...v4.4.0) (2019-12-05)


### Features

* Provide own application/subsystem for logging errors ([201f187](https://github.com/adobe/helix-log/commit/201f187bf9418fb00db6582b3372d0b51a9f23c4))

# [4.3.0](https://github.com/adobe/helix-log/compare/v4.2.0...v4.3.0) (2019-12-04)


### Features

* Winston Transport Interface ([8741d04](https://github.com/adobe/helix-log/commit/8741d048057edebd4fd066d15c94aaf3d9229fb9))

# [4.2.0](https://github.com/adobe/helix-log/compare/v4.1.0...v4.2.0) (2019-12-04)


### Features

* **log:** add InterfaceBase.child(opts) to simplify derived loggers ([#67](https://github.com/adobe/helix-log/issues/67)) ([8498427](https://github.com/adobe/helix-log/commit/849842718e7a8dc5c6845320aa070a715d8c7c88))

# [4.1.0](https://github.com/adobe/helix-log/compare/v4.0.0...v4.1.0) (2019-11-22)


### Features

* Make CoralogixLogger resilient against short network outages ([9de97b2](https://github.com/adobe/helix-log/commit/9de97b2f5ec4445fb4db584915fa9b545f1cb79d)), closes [#60](https://github.com/adobe/helix-log/issues/60)

# [4.0.0](https://github.com/adobe/helix-log/compare/v3.1.0...v4.0.0) (2019-11-08)


### chore

* Get rid of logdna ([1b7ce3f](https://github.com/adobe/helix-log/commit/1b7ce3f29f08dc759a0435f562b377c4a667b049))


### BREAKING CHANGES

* We don't use them and they did not get back to us.

# [3.1.0](https://github.com/adobe/helix-log/compare/v3.0.0...v3.1.0) (2019-11-08)


### Features

* Increase resolution of timestamps to nanoseconds ([a7860f9](https://github.com/adobe/helix-log/commit/a7860f9deb672a0e70968f496716cfd6393550a8)), closes [#43](https://github.com/adobe/helix-log/issues/43)

# [3.0.0](https://github.com/adobe/helix-log/compare/v2.2.2...v3.0.0) (2019-10-16)


### Features

* Fields oriented logging ([e9c8ff3](https://github.com/adobe/helix-log/commit/e9c8ff3)), closes [#21](https://github.com/adobe/helix-log/issues/21)
* Gracefully handle incorrect message field ([299378d](https://github.com/adobe/helix-log/commit/299378d))
* Hide API keys ([67e3761](https://github.com/adobe/helix-log/commit/67e3761)), closes [#44](https://github.com/adobe/helix-log/issues/44)
* jsonifyForLog now supports arbitrary types ([f0a5f86](https://github.com/adobe/helix-log/commit/f0a5f86)), closes [#45](https://github.com/adobe/helix-log/issues/45)
* Provide a filter for getting rid of bunyan fields ([b43ad44](https://github.com/adobe/helix-log/commit/b43ad44))


### BREAKING CHANGES

* This constitutes a major refactor
which touches many pieces of code.

The most prominent feature of this is that the message format changed,
we switch from the old array format to an object that contains some
standard fields and arbitrary other fields. This new message format
is extensively documented.

A makeLogMessage function is provided to facilitate the creation of
log messages.

Since the log message format is now suitable for manipulation by external
code, the MemLogger no longer performs formatting by default (it saves
messages as-is).

The timestamp and log level are now fields. We got rid of the additional
options passed to the `log()` method.

The other big feature of this is that we formalize the concept of `Interfaces`.
Extensive documentation is provided for Interfaces, Loggers and Formatters.

The concept of a formatter was additionally documented as well.

The SimpleInterface is provided as the default interface. Global functions for
using the simple interface with rootLogger are retained.

This simple interface no longer performs fuzzy matching on potential json-serializable
objects, instead users must now explicitly specify they wish to set custom fields.

In order to make working with messages easier, all Interfaces & Loggers now
feature (1) a filter function parameter which can be used to arbitrarily drop
or transform messages passing through the logger (2) a level parameter which
can be used to filter log messages based on level.
As a side effect of this implicit error handling was moved into a single function
and improved.

The default parameters for level & filter are now 'silly' & identity (the no-op
values); the users must explicitly choose to drop any log levels.

In order to facilitate the implementation of Interfaces and Loggers, base classes
are provided for each.

## [2.2.2](https://github.com/adobe/helix-log/compare/v2.2.1...v2.2.2) (2019-09-28)


### Bug Fixes

* **log:** revert LogFacade changes ([#50](https://github.com/adobe/helix-log/issues/50)) ([34d2f9a](https://github.com/adobe/helix-log/commit/34d2f9a))

## [2.2.1](https://github.com/adobe/helix-log/compare/v2.2.0...v2.2.1) (2019-09-27)


### Bug Fixes

* **coralogix:** data fields are not logged ([#49](https://github.com/adobe/helix-log/issues/49)) ([f51e44e](https://github.com/adobe/helix-log/commit/f51e44e))

# [2.2.0](https://github.com/adobe/helix-log/compare/v2.1.1...v2.2.0) (2019-09-26)


### Features

* **log:** add log facade that allows to bind data values for json logging ([#42](https://github.com/adobe/helix-log/issues/42)) ([9c91fd2](https://github.com/adobe/helix-log/commit/9c91fd2)), closes [#34](https://github.com/adobe/helix-log/issues/34) [#26](https://github.com/adobe/helix-log/issues/26) [#30](https://github.com/adobe/helix-log/issues/30)

## [2.1.1](https://github.com/adobe/helix-log/compare/v2.1.0...v2.1.1) (2019-09-26)


### Bug Fixes

* **log:** allow serialization of undefined ([87812be](https://github.com/adobe/helix-log/commit/87812be)), closes [#46](https://github.com/adobe/helix-log/issues/46)

# [2.1.0](https://github.com/adobe/helix-log/compare/v2.0.1...v2.1.0) (2019-09-25)


### Features

* **log:** make console logger stream configurable ([#41](https://github.com/adobe/helix-log/issues/41)) ([445421b](https://github.com/adobe/helix-log/commit/445421b)), closes [#38](https://github.com/adobe/helix-log/issues/38)

## [2.0.1](https://github.com/adobe/helix-log/compare/v2.0.0...v2.0.1) (2019-09-20)


### Bug Fixes

* **log:** avoid error when using helix-log in a (web)package ([8b050cf](https://github.com/adobe/helix-log/commit/8b050cf)), closes [#31](https://github.com/adobe/helix-log/issues/31)

# [2.0.0](https://github.com/adobe/helix-log/compare/v1.3.0...v2.0.0) (2019-09-17)


### chore

* Get rid of StreamLogger ([d80738b](https://github.com/adobe/helix-log/commit/d80738b))


### Features

* Introduce an adapter for bunyan ([bf4b469](https://github.com/adobe/helix-log/commit/bf4b469))


### BREAKING CHANGES

* Removes StreamLogger

StreamLogger was not used and did not feature a proper timer
based flushing mechanism, so using it required manually calling
flush which is not user friendly.

Should the need for such a logger arise again, it will be reintroduced
together with proper automatic flushing.

# [1.3.0](https://github.com/adobe/helix-log/compare/v1.2.0...v1.3.0) (2019-09-10)


### Features

* Switch from loggly to coralogix+logdna ([1e409cc](https://github.com/adobe/helix-log/commit/1e409cc))

# [1.2.0](https://github.com/adobe/helix-log/compare/v1.1.2...v1.2.0) (2019-08-21)


### Features

* log() should be an alias to info() in order to be compatible with console. ([af8d51b](https://github.com/adobe/helix-log/commit/af8d51b))

## [1.1.1](https://github.com/adobe/helix-log/compare/v1.1.0...v1.1.1) (2019-08-16)


### Bug Fixes

* **npm:** ignore not needed files ([2b5eb56](https://github.com/adobe/helix-log/commit/2b5eb56))

# 1.0.0 (2019-08-16)


### Bug Fixes

* node v8 compatibility ([33b18d5](https://github.com/adobe/helix-log/commit/33b18d5))
* **ci:** update tokens ([8a05934](https://github.com/adobe/helix-log/commit/8a05934))
* **release:** trigger release ([418249d](https://github.com/adobe/helix-log/commit/418249d))


### Features

* FileLogger is now synchronous ([ba45076](https://github.com/adobe/helix-log/commit/ba45076))
* Separate log format & logger ([4e1e068](https://github.com/adobe/helix-log/commit/4e1e068))
