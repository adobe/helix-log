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
