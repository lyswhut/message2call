# message2call change log

All notable changes to this project will be documented in this file.

Project versioning adheres to [Semantic Versioning](http://semver.org/).
Commit convention is based on [Conventional Commits](http://conventionalcommits.org).
Change log format is based on [Keep a Changelog](http://keepachangelog.com/).

## [1.0.0](https://github.com/lyswhut/message2call/compare/v0.1.3...v1.0.0) - 2024-01-05

### BREAKING CHANGE

- Remove `createQueueRemote(name)`, use `createRemoteGroup(name, { queue: true })` instead.

### Change

- Add `createRemoteGroup`
- Add `isSendErrorStack` option
- Remove `createQueueRemote`
