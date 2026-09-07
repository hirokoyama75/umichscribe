# Changelog

## [1.0.1] - 2026-09-04
### Fixed
- Chrome Web Store compliance: Replaced SVG icons with PNG icons (16×16, 32×32, 48×48, 128×128).
- Tailored manifest build pipeline to strip Firefox-specific `browser_specific_settings` in Chrome distribution.
- Narrowed host permission from wildcard `*.amazonaws.com` to `s3.amazonaws.com` under Principle of Least Privilege.
- Added comprehensive `PRIVACY.md` detailing 100% client-side execution and zero data collection.

## [1.0.0] - 2026-09-03
### Added
- Initial clean-room implementation of UMichScribe.
- Support for Kaltura, LeeCap, and Canvas-embedded players.
- Multimodal PDF export embedding full-resolution 960×720 visual slides for AI vision (Claude 3.5 Sonnet, ChatGPT-4o).
- High-throughput asynchronous worker pool for 10x faster concurrent slide image downloading.
- Rich Markdown export (with slide section headers and linked images) and Plain Text export.
- Time range filtering and conservative caption cleanup (duplicate removal and fragment merging).
- Live progress indicator in popup UI.
