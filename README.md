# Lecture Transcript Exporter

> Unofficial — not affiliated with or endorsed by the University of Michigan, Instructure, or Kaltura.

Lecture Transcript Exporter is a clean-room browser extension that extracts transcripts from university lecture videos for study and AI-assisted review. 

It supports extracting transcripts and structural context (like slides and chapters) directly from authenticated lecture pages without bypassing any security or authorization. 

## Features
- **Transcript Extraction:** Easily copy or download transcripts in Markdown (.md) or Plain Text (.txt).
- **AI Context Mode:** Export a structured view containing slide boundaries, chapter titles, and embedded transcript text—ideal for dropping into an AI assistant.
- **Privacy First:** All extraction runs locally in your browser. No analytics, no server uploads, no external AI service. 

## Permissions Justification
- `activeTab`: Used to query the current page for video players and transcripts when you click the extension popup.
- `webNavigation`: Used to detect Canvas SPA navigation and iframes to appropriately locate the embedded lecture players.
- `downloads`: Used to save the extracted transcript to your local filesystem.
- `Host Permissions`: Required to inject the extraction script into authorized Kaltura and LeeCap players and Canvas embeds.

## Privacy Policy
All processing happens locally on your device. The extension does not collect, store, or transmit any analytics, telemetry, personal data, lecture content, or identifiers to any remote server. It simply reads the transcript from the page you are authorized to view and formats it for you to download. 

## Compatibility Matrix
- **Kaltura / MiVideo:** Implemented, awaiting authenticated verification.
- **Kaltura in Canvas:** Implemented, awaiting authenticated verification.
- **LeeCap:** Implemented, awaiting authenticated verification.

*Note: A platform is only supported when a transcript or caption source exists and is normally accessible to the signed-in user. This extension does not generate transcripts from audio.*

## Troubleshooting & Diagnostics
If the extension isn't working on a supported platform, open the popup and click "Copy Diagnostics". Paste this into a new [GitHub Issue](https://github.com/HiroK/lecture-transcript-exporter/issues). The diagnostics exclude sensitive URLs, tokens, or personal identifiers.
