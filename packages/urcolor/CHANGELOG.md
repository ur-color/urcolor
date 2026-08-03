# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Added

- `urcolor`: the unscoped name for `@urcolor/core`. It re-exports the core and
  depends on it by the same caret range the framework adapters use, so both
  specifiers resolve to one module instance and one `Color` class — an instance
  built through either passes `instanceof` through the other.

  Versions track `@urcolor/core` one-for-one; this package has no release notes
  of its own beyond that. See
  [the core changelog](../core/CHANGELOG.md) for what actually changed.
