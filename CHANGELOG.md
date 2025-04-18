# message2call change log

All notable changes to this project will be documented in this file.

Project versioning adheres to [Semantic Versioning](http://semver.org/).
Commit convention is based on [Conventional Commits](http://conventionalcommits.org).
Change log format is based on [Keep a Changelog](http://keepachangelog.com/).

## [2.0.3](https://github.com/lyswhut/message2call/compare/v2.0.2...v2.0.3) - 2025-03-29

- fix `performance is not defined`

## [2.0.2](https://github.com/lyswhut/message2call/compare/v2.0.1...v2.0.2) - 2025-03-29

### BREAKING CHANGE

- Rename `proxyObj` to `exposeObj`

## [2.0.1](https://github.com/lyswhut/message2call/compare/v2.0.0...v2.0.1) - 2025-03-29

### Fix

- Re-export common types

## [2.0.0](https://github.com/lyswhut/message2call/compare/v1.1.1...v2.0.0) - 2025-03-29

### BREAKING CHANGE

- Changing the message data format
- Rename `createMsg2call` to `createMessage2Call`
- Convert to pure ESM module

## [1.1.1](https://github.com/lyswhut/message2call/compare/v1.1.0...v1.1.1) - 2024-12-05

### Fix

- Fix call timeout error message emit

## [1.1.0](https://github.com/lyswhut/message2call/compare/v1.0.0...v1.1.0) - 2024-05-17

### Change

- Use `Promise.resolve().then(callback)` instead of `setTimeout(callback)`

## [1.0.0](https://github.com/lyswhut/message2call/compare/v0.1.3...v1.0.0) - 2024-01-05

### BREAKING CHANGE

- Remove `createQueueRemote(name)`, use `createRemoteGroup(name, { queue: true })` instead.

### Change

- Add `createProxyCallback`
- Add `releaseAllProxyCallback`
- Add `createRemoteGroup`
- Add `isSendErrorStack` option
- Remove `createQueueRemote`
