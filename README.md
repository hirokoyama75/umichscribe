# UMichScribe: U-M Lecture Transcript & Slide Exporter

[![CI](https://github.com/hirokoyama75/lecture-transcript-exporter/actions/workflows/ci.yml/badge.svg)](https://github.com/hirokoyama75/lecture-transcript-exporter/actions/workflows/ci.yml)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Disclaimer:** Unofficial tool. Not affiliated with, endorsed by, or sponsored by the University of Michigan, Instructure, or Kaltura.

**UMichScribe** is an original, privacy-first Manifest V3 browser extension for Firefox and Chromium browsers that extracts synchronized transcripts and high-definition slide milestones from University of Michigan lecture recordings.

Designed specifically for students who want to review lectures efficiently or feed structured context into LLMs (like Claude, ChatGPT, or Gemini), it captures the spoken words alongside exact slide transition timestamps and full-resolution visual slide frames.

---

## Key Features

* **AI Context Export:** Interleaves lecture transcripts with synchronized slide boundaries, numbering (`Slide 1`, `Slide 2`), timestamps, and 960×720 high-resolution visual slide images.
* **Transcript-Only Mode:** Offers a clean, continuous text export without slide markers for linear reading.
* **Format Flexibility:**
  * **Markdown (`.md`):** Rich formatting with section headers, timestamped cues, bold speaker labels, and embedded visual slide images. Ideal for Obsidian, Notion, GitHub, and multimodal AI prompting.
  * **Plain Text (`.txt`):** Lightweight, zero-dependency text formatted for universal scratchpads and standard terminal tools.
* **Automatic File Naming:** Automatically discovers course codes and lecture recording dates to generate clean filenames (e.g., `STATS 250 - 2026-09-02.md`).
* **Time Range Filtering:** Choose custom start and end times to export specific problem walkthroughs or lecture segments.
* **Conservative Cue Cleanup:** Intelligently merges adjacent transcript fragments and removes identical consecutive caption cues without altering professor phrasing.
* **100% Local & Privacy-Conscious:** Zero external network calls, zero third-party analytics, zero cloud storage, and no media downloading.

### 📄 Example Export Output (`.md`)

```markdown
# STATS 250 - Fall 2026
**Date:** 2026-09-02
---

## Slide 1 [00:00]
![Slide 1](https://s3.amazonaws.com/leccap.engin.umich.edu/media/.../0.jpg)

[00:00] Thank you.
[04:05] Okay, let's get started. Good morning, Stats 250!
[04:18] Excellent. Perfect. Welcome to what is perhaps your more typical lecture experience.

## Slide 2 [02:35]
![Slide 2](https://s3.amazonaws.com/leccap.engin.umich.edu/media/.../18.jpg)

[04:38] To begin with, every single lecture opens up with the same type of slide where we remind you of upcoming deadlines.
[04:46] As you see, there is only one thing due at the end of the week: your practice exam prep assignment.
```

---

## Technical Architecture & Engineering Decisions

```
src/
├── adapters/          # Player-specific extraction modules
│   ├── leccap/        # University of Michigan LecCap adapter
│   ├── kaltura/       # MiVideo / Kaltura adapter
│   └── canvas/        # Canvas LMS frame & navigation watcher
├── core/              # Player-agnostic business logic
│   ├── formatting.ts  # Markdown and TXT serializing engines
│   ├── cleanup.ts     # Caption deduplication and fragment merging
│   ├── ranges.ts      # Chronological timestamp range filter
│   ├── filename.ts    # Cross-platform OS filename sanitization
│   ├── vtt.ts         # Lightweight WebVTT parser
│   └── types.ts       # Strict TypeScript domain interfaces
├── content/           # Multi-frame content script injection
└── popup/             # Accessible, modern Manifest V3 popup UI
```

### 1. Adapter Pattern for Player Isolation
Instead of coupling player scraping into the popup or UI layer, every platform implements a decoupled adapter interface:
* **Detection:** Self-contained `isMatch(url, document)` check.
* **Extraction:** Returns normalized domain models (`TranscriptSegment`, `ContextMarker`, `ExtractionResult`).
* **Multi-Strategy Fallbacks:** Adapters probe internal JSON APIs, HTML5 `textTracks` cues, WebVTT caption tracks, and DOM structures gracefully.

### 2. Reverse-Engineering LecCap API & Slide Resolution
Rather than scraping low-resolution DOM thumbnails (`t18.jpg` at 160×120px) or attempting costly in-browser video OCR, the extension hooks into LecCap's underlying product endpoint (`/leccap/player/api/product/?rk={rk}`). This provides:
* **Full-Resolution Slide Imagery:** Automatically resolves 960×720 full-size slide captures (`18.jpg`) directly from authorized S3 storage.
* **Microsecond Caption Timing:** Access to all 1,000+ caption cues with exact millisecond boundaries (`intime`/`outtime`).
* **Timing Desync Correction:** Compensates for known player-level rounding quirks in `aria-label` timestamp generators.

### 3. Iframe & Single Page Application (SPA) Handling
Embedded video players inside Canvas LMS often run within nested cross-origin iframes. 
* The extension injects content scripts with `all_frames: true` and queries frame hierarchies via `chrome.webNavigation` and runtime messaging rather than attempting cross-origin DOM traversal.
* A lightweight Canvas SPA listener monitors history transitions to re-detect active players upon course navigation without persistent CPU polling.

### 4. Reliable Client-Side File Streaming
Chrome MV3 extensions restrict large Data URIs (`data:text/plain,...`), causing downloads over ~50KB to fail with `SERVER_BAD_CONTENT`. We engineered a direct DOM `Blob` URL pipeline triggered via a synthetic anchor element (`URL.createObjectURL(blob)`), allowing multi-megabyte lecture transcripts to download instantly.

---

## Privacy & Permissions

This extension operates under a strict principle of least privilege:

| Permission | Technical Justification |
| :--- | :--- |
| `activeTab` | Inspects the active lecture tab only when the user clicks the extension popup. |
| `webNavigation` | Detects iframe hierarchies to locate embedded video players across course portals. |
| `downloads` | Saves exported `.md` and `.txt` files directly to the user's local filesystem. |
| `host_permissions` | Scoped strictly to `canvas.umich.edu`, `leccap.engin.umich.edu`, and `*.kaltura.com`. Never requests `<all_urls>`. |

All processing is purely local. The extension never downloads video/audio streams, never circumvents authentication or DRM, and never transmits lecture materials to external servers.

---

## Development & Build

### Prerequisites
* Node.js 18+
* npm

### Setup
```bash
# Clone the repository
git clone https://github.com/hirokoyama75/lecture-transcript-exporter.git
cd lecture-transcript-exporter

# Install dependencies
npm install

# Run unit tests
npm test

# Build production bundle
npm run build

# Validate Mozilla & Chromium extension manifest standards
npm run lint

# Package extension zip
npm run package
```

### Loading in Browsers

#### Chrome / Chromium (Brave, Edge):
1. Navigate to `chrome://extensions/`
2. Enable **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select the `dist/` directory.

#### Firefox:
1. Navigate to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on...**
3. Select `dist/manifest.json`.

---

## License

Released under the [MIT License](LICENSE).
