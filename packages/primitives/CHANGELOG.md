# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Added

- Initial release: the framework-agnostic behavior every binding shares —
  pointer drag tracking, keyboard interaction, channel models, slider and
  toggle state, canvas helpers, data attributes and label resolution.
- Consumed by `@urcolor/vue`, `@urcolor/react`, `@urcolor/svelte` and
  `@urcolor/angular`. It is published so those packages can depend on it, not
  because applications are expected to use it directly.
