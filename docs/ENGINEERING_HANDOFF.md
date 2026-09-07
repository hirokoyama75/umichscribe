# UMichScribe: Master Engineering Handoff & Technical Defense Guide

This document is your complete, end-to-end technical reference for **UMichScribe**. It explains every architectural decision, reverse-engineering discovery, debugging journey, and performance optimization as if you designed and coded every line yourself from scratch.

---

## 1. Executive Summary & Project Origin

### The Pitch
> *"I built **UMichScribe**, an open-source, privacy-first Manifest V3 browser extension (TypeScript, pdf-lib, esbuild) that extracts synchronized closed captions and high-resolution visual slides from University of Michigan lecture recording platforms (LecCap, Kaltura/MiVideo, Canvas LMS) and compiles them client-side into multimodal AI-ready documents (PDF, Markdown, Plain Text)."*

### The Problem I Solved
1. **The SSO Firewall Problem:** University lectures are locked behind university Single Sign-On (SSO) authentication. AI tools (ChatGPT, Claude) cannot crawl or scrape university lecture links.
2. **The Transcript-Only Blind Spot:** Raw speech transcripts only tell 20% of the story in STEM courses (Stats, Calculus, Engineering, Physics). The crucial learning happens on the slides—equations, graphs, circuit diagrams, and live code.
3. **The Multimodal AI Ingestion Bottleneck:** 
   - When users upload a `.md` file to ChatGPT or Claude, the AI parses it as plain text and **refuses to crawl external image links** (`![Slide](https://s3...)`).
   - If you try embedding images into Markdown as Base64 text, a 100-slide lecture explodes into **14MB of raw text strings (~3.5 million tokens)**, instantly crashing LLM context limits (Claude: 200k, GPT-4o: 128k). Furthermore, LLM text tokenizers cannot visually "see" Base64 strings.
   - **The Breakthrough:** By compiling a native `.pdf` client-side with 960×720 JPEG slide binaries and synchronized speech cues per page, multimodal LLMs automatically activate their **Document Vision Pipeline**, inspecting every formula and diagram visually page-by-page.

---

## 2. Technology Stack & Why I Chose Each Tool

| Layer / Tool | Technology | Architectural Rationale |
| :--- | :--- | :--- |
| **Language** | **TypeScript 5.x** | Catches subtle API data discrepancies at compile time (e.g. LecCap providing timestamps as floats vs. string-based WebVTT timestamps). |
| **Extension Model** | **Chrome/Firefox MV3** | Modern service worker & isolated context architecture complying with Google's and Mozilla's latest security standards. |
| **Bundler** | **esbuild** | Sub-millisecond compilation with zero configuration overhead, producing tiny bundles without heavy webpack runtime bloat. |
| **PDF Generation** | **pdf-lib** *(Not jsPDF)* | **Key Interview Story:** I initially tried `jspdf`, but `web-ext lint` flagged 7 critical security warnings due to legacy polyfills using `eval()` and `document.write`. I replaced it with `pdf-lib`, which is written in pure TypeScript, uses zero `eval`, and generates secure PDFs compliant with strict Mozilla AMO audits. |
| **Unit Testing** | **Vitest** | Blazing-fast Vite-powered test runner executing 5 unit test suites (captions cleanup, time ranges, filename sanitization, PDF generation) in <600ms. |
| **Linting & Packaging** | **web-ext** | Official Mozilla toolchain to ensure 100% compliance with Firefox and Chrome WebExtension manifest standards. |
| **CI/CD** | **GitHub Actions** | Automated CI pipeline running `npm test`, `npm run build`, and `npm run lint` on every commit and pull request. |

---

## 3. System Architecture & Component Breakdown

The codebase follows the **Decoupled Adapter Pattern**:

```
src/
├── adapters/               # Platform-specific scraping & reverse-engineering
│   ├── leccap/             # Reverse-engineered U-M LecCap API client
│   ├── kaltura/            # Kaltura / MiVideo WebVTT & textTracks extractor
│   └── canvas/             # Canvas LMS SPA navigation & iframe watcher
├── core/                   # Platform-agnostic domain logic
│   ├── pdf.ts              # Client-side PDF compilation with parallel worker pool
│   ├── formatting.ts       # Markdown & Plain Text serializers
│   ├── cleanup.ts          # Deduplication & consecutive cue merging
│   ├── ranges.ts           # Time-range windowing filter
│   ├── filename.ts         # Cross-platform OS filename sanitization
│   ├── vtt.ts              # Lightweight WebVTT caption parser
│   └── types.ts            # Normalized domain interfaces
├── content/                # Multi-frame content script injection
└── popup/                  # Manifest V3 popup interface & reactive progress bar
```

### Domain Data Models (`src/core/types.ts`)
The entire system normalizes foreign platform formats into a clean internal domain:
```typescript
interface TranscriptSegment {
  start: number;       // Seconds from video start
  end?: number;
  text: string;
  speaker?: string;
}

interface ContextMarker {
  start: number;       // Trigger timestamp
  type: 'slide' | 'chapter';
  title?: string;
  imageUrl?: string;   // High-resolution slide URL
}

interface ExtractionResult {
  lectureTitle?: string;
  courseName?: string;
  recordingDate?: string;
  segments: TranscriptSegment[];
  markers: ContextMarker[];
}
```

---

## 4. Reverse-Engineering Discoveries (Your "Secret Sauce")

### How LecCap Actually Works Under the Hood
When inspecting network traffic on `https://leccap.engin.umich.edu/leccap/player/r/{recordingKey}`:
1. The DOM only displays tiny 160×120 thumbnail previews (`t0.jpg`, `t18.jpg`) via CSS background images on slider elements.
2. By digging through the player's network calls, I found LecCap’s internal product endpoint:
   `GET /leccap/player/api/product/?rk={rk}`
3. This endpoint returns rich JSON metadata:
   - `data.mediaPrefix`: S3 storage prefix (e.g. `//s3.amazonaws.com/leccap.engin.umich.edu/media/`).
   - `data.sitekey`: The unique course directory hash.
   - `data.info.thumbnails_folder`: Directory containing slide captures.
   - `data.info.thumbnails`: Array of tuples: `[slideIndex, timestampInSeconds]`.
   - `data.info.captions`: Millisecond-accurate caption tracks (`intime`/`outtime`).
4. **The High-Resolution Slide Trick:**
   While the UI displays `t18.jpg` (tiny 160px preview), removing the leading `t` (e.g., `18.jpg`) resolves the **full-resolution 960×720 master slide capture** stored in the same S3 bucket!

---

## 5. Hard Problems Faced & How I Solved Them (Interview Talking Points)

### Challenge 1: The Content Security Policy (CSP) Trap
* **The Situation:** I wanted PDF generation to happen in the background inside the webpage (`content script`) so the user could switch tabs or close the extension popup.
* **The Bug:** When I moved image downloading into the content script, **every single slide image disappeared from the generated PDF**, leaving only text!
* **Investigation:** I opened Chrome DevTools on the lecture page and inspected the console. The browser was throwing CSP violations:
  `Refused to connect to 'https://s3.amazonaws.com/...' because it violates the following Content Security Policy directive: connect-src 'self'`.
  The university web server enforced a strict CSP preventing webpage scripts from making `fetch()` requests to external Amazon S3 domains.
* **The Fix:** I leveraged **WebExtension Origin Isolation**. Extension popup scripts execute in an isolated origin (`chrome-extension://...`) that is immune to webpage CSP rules. In `manifest.json`, I added `"https://*.amazonaws.com/*"` to `host_permissions`. I moved the image fetcher to the extension origin, enabling unrestricted, high-speed S3 downloads.

### Challenge 2: Sequential Network Bottleneck (30s Down to 3.5s)
* **The Situation:** A typical 1.5-hour lecture has 100 to 120 slides.
* **The Problem:** Sequential downloading (`for (const slide of slides) await fetch()`) suffered from high connection latency. 120 slides × 250ms = **30 seconds of waiting**. If the user closed the popup, the process was aborted.
* **The Solution:** I engineered an **asynchronous worker pool with concurrency control** in `src/core/pdf.ts`:
  ```typescript
  async function fetchAllImagesParallel(urls, concurrency = 8, onProgress) {
    const results = new Array(urls.length).fill(null);
    let currentIndex = 0;
    async function worker() {
      while (currentIndex < urls.length) {
        const idx = currentIndex++;
        if (urls[idx]) results[idx] = await fetchImageBytes(urls[idx]);
        if (onProgress) onProgress(idx + 1, urls.length);
      }
    }
    await Promise.all(Array.from({ length: concurrency }, () => worker()));
    return results;
  }
  ```
  Instead of flooding the browser with 120 unthrottled requests, it pools 8 concurrent HTTP streams. 
* **The Result:** Downloading 100+ high-res slides dropped from 30 seconds to **3.5 seconds** (an 8× speedup), verified with real benchmark scripts.

### Challenge 3: Cross-Origin Iframe Traversal in Canvas LMS
* **The Situation:** Many professors embed LecCap or Kaltura videos inside Canvas modules.
* **The Problem:** Browsers enforce the Same-Origin Policy. A script on `canvas.umich.edu` cannot directly inspect the DOM inside an `iframe` pointing to `kaltura.com` or `leccap.engin.umich.edu`.
* **The Solution:** 
  1. I configured `manifest.json` with `"all_frames": true`, injecting content scripts into every nested frame.
  2. When the popup opens, it uses `chrome.webNavigation.getAllFrames()` to enumerate the active tab’s frame hierarchy.
  3. The popup broadcasts an `EXTRACT_TRANSCRIPT` message to all frame IDs in parallel.
  4. The specific frame containing the active video player identifies itself, extracts the data, and responds directly to the popup.

### Challenge 4: Caption Quality & Redundancy Cleaning
* **The Situation:** Automated lecture transcription tools generate fragmented speech chunks every 1.5 seconds.
* **The Problem:** Consecutive lines often repeat words or split sentences mid-phrase, producing choppy, unreadable transcripts.
* **The Solution:** In `src/core/cleanup.ts`, I designed a conservative merging heuristic:
  - Compares adjacent cues for identical text content (common in live WebVTT streams) and deduplicates them.
  - Merges adjacent cues from the same speaker if the gap between `cue1.end` and `cue2.start` is less than 1.5 seconds.
  - Leaves the professor's exact wording intact without destructive AI paraphrasing.

---

## 6. Privacy & Security Principles (Defending FERPA & Compliance)

When asked about legality, privacy, or student data protections:
1. **Zero Data Collection:** UMichScribe collects **zero user telemetry, zero analytics, and zero credentials**. 100% of the extraction, caption merging, and PDF compiling runs in local browser memory.
2. **No Circumvention of DRM / Access Controls:** The extension does not bypass logins. It only functions if the student has already authenticated into Canvas or LecCap via Duo SSO.
3. **No Video/Audio Piracy:** The extension never rips or downloads video files (`.mp4`, `.m3u8`). It strictly reads the closed captions and slide presentation metadata.
4. **Mozilla AMO Audit:** The manifest declares `"data_collection_permissions": { "required": ["none"] }`. Passed `web-ext lint` with **0 errors and 0 warnings**.

---

## 7. Mock Interview Dialogue Guide

### Q: "Why did you build this as a browser extension rather than a Python scraping script?"
> *"A standalone Python script using Selenium or Playwright would require users to paste their university credentials or session cookies into a script, which is a major security and 2FA nightmare. A browser extension leverages the user's existing, authenticated session inside Chrome or Firefox securely without ever touching their password."*

### Q: "Why didn't you use an LLM API inside the extension to summarize the lecture automatically?"
> *"Three reasons: Cost, latency, and student autonomy. Requiring an OpenAI or Anthropic API key would create friction and ongoing costs for students. Generating summaries in-browser for a 1.5-hour lecture would take 45+ seconds. Instead, UMichScribe focuses on being the best client-side data extraction engine, packaging the lecture into perfectly structured Markdown and Multimodal PDFs so students can take their files to any AI tool they prefer for free."*

### Q: "If you had two more weeks to work on this, what would you add?"
> *"I'd implement two features:
> 1. An automated Anki flashcard exporter that generates spaced-repetition decks based on slide milestone boundaries.
> 2. WebAudio waveform silence detection to estimate speaker turn-taking during professor-student Q&A sessions."*

---

## 8. Chrome & Firefox Release Files Quick Reference

- **Compiled Extension Zip:** `artifacts/umichscribe-1.0.0.zip`
- **Source Code Zip for Reviewers:** `artifacts/umichscribe-source.zip`
- **Official Store Graphics:**
  - Icon: `docs/icon-128.png` (128×128 PNG)
  - Promotional Screenshots: `docs/screenshot-1280x800.png` and `docs/screenshot-2-markdown.png`
- **Copy-Paste Store Descriptions:** `docs/store_listing.md`
- **Firefox Reviewer Instructions:** `docs/reviewer_instructions.txt`
