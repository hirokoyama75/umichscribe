# Changelog

## [1.0.3] - 2026-09-10
### Added
- Built-in 2-Stage AI Lecture Reconstruction & Interactive Tutoring pipeline.
- 1-click prompt copy buttons in popup for Step 1 (Lecture Reconstructor) and Step 2 (Interactive Socratic Tutor).
- In-popup interactive "AI Study Guide" modal accessible from the header on any page.
- Background `onUpdateAvailable` listener to apply Chrome Web Store & Firefox AMO updates smoothly.

## [1.0.2] - 2026-09-09
### Fixed
- Fixed content script inactivity on tabs opened before extension was installed/reloaded via background `onInstalled` injection and popup just-in-time fallback injection.
- Fixed "Copy Diagnostics" button failing silently when connection to content script could not be established.
- Added clipboard copy fallback (`document.execCommand('copy')`) and dynamic button state feedback ("Copied!" / "Copy Failed").
- Declared `"scripting"` and `"clipboardWrite"` permissions across Chrome and Firefox MV3.

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
