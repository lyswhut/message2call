# message2call change log

All notable changes to this project will be documented in this file.

Project versioning adheres to [Semantic Versioning](http://semver.org/).
Commit convention is based on [Conventional Commits](http://conventionalcommits.org).
Change log format is based on [Keep a Changelog](http://keepachangelog.com/).

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
