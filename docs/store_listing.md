# UMichScribe — Official Store Listing & Metadata

This document contains the exact metadata, short summary, and detailed description ready to copy-paste into the **Chrome Web Store Developer Dashboard** and **Mozilla Add-ons (AMO)** submission forms.

---

## 1. Extension Basic Info

* **Extension Name:** `UMichScribe: U-M Lecture Transcript & Slide Exporter`
* **Short Name:** `UMichScribe`
* **Version:** `1.0.0`
* **Category:** `Productivity` / `Education`
* **Language:** `English`
* **Homepage / Support URL:** `https://github.com/hirokoyama75/umichscribe`

---

## 2. Short Description / Summary (Under 132 Characters)

> Export synchronized U-M lecture transcripts and high-res slides into AI-ready PDFs and Markdown notes. 100% private and client-side.

*(Exact length: 131 characters — fits within Chrome's 132-char and Firefox's 250-char limit).*

---

## 3. Full Detailed Description (Formatted for Chrome & Firefox)

```markdown
UMichScribe is a privacy-first, open-source browser extension that extracts synchronized lecture transcripts and high-definition slide milestones from University of Michigan lecture recordings (LecCap, Kaltura, and Canvas LMS).

Designed for students who want to study efficiently or feed rich lecture context into modern multimodal AI models (Claude 3.5 Sonnet, ChatGPT-4o, and Gemini), UMichScribe pairs spoken instructor dialogue with the exact visual slide frame being discussed.

---

### 🌟 Key Features

* 📄 **Embedded PDF Export (Best for AI Vision):**
  Embeds full-resolution 960×720 visual slide captures directly on each page alongside synchronized speech cues. Upload directly to Claude or ChatGPT to let multimodal vision read handwritten math, complex diagrams, circuit graphs, and code.

* 📝 **Markdown Export (.md):**
  Generates clean, beautifully formatted notes with `#` headers, slide timestamps, speaker cues, and embedded slide images. Ready for instant import into Obsidian, Notion, Logseq, and Bear.

* 📄 **Plain Text Export (.txt):**
  Pure, lightweight text formatted for universal scratchpads, terminal searching, and fast copy-pasting.

* ⚡ **10× Fast Parallel Downloading:**
  Employs an asynchronous worker pool with concurrent connections to download 100+ slide frames and compile a complete lecture in just 3 to 4 seconds.

* 🎯 **Smart Lecture Detection:**
  Automatically discovers course numbers and recording dates (e.g., `STATS 250 - 2026-09-02.pdf`) for effortless organization.

* ⏱️ **Time Range Filtering:**
  Filter by custom start and end timestamps to export specific problem walkthroughs or exam review segments.

* 🧹 **Conservative Caption Cleanup:**
  Intelligently merges fragmented captions and removes duplicate cues without altering professor phrasing or meaning.

---

### 🔒 100% Private & Client-Side

* **Zero Cloud Storage:** All extraction, caption merging, and PDF compiling happens entirely inside your browser's memory.
* **No Third-Party Trackers:** No analytics, no telemetry, no tracking cookies, and no background beacons.
* **No Video/Audio Downloading:** Does not rip or pirate media streams. Operates only on authorized closed-caption interfaces and slide metadata you are currently viewing.
* **Permission Minimalism:** Requires zero access to personal data, browsing history, or external websites.

---

### 🎓 Supported Platforms
* University of Michigan LecCap (`leccap.engin.umich.edu`)
* University of Michigan MiVideo / Kaltura (`*.kaltura.com`)
* Canvas LMS Embedded Lecture Players (`canvas.umich.edu`)

---

### ⚖️ Disclaimer
*Unofficial tool created for student study efficiency. Not affiliated with, sponsored by, or endorsed by the University of Michigan, Instructure, or Kaltura. Requires authenticated student or faculty access to view recordings.*
```

---

## 4. Single-Purpose Description (For Chrome Web Store Privacy Form)

> UMichScribe has a single, focused purpose: to extract synchronized closed-caption transcripts and visual slide milestones from University of Michigan lecture player web pages and compile them into study documents (PDF, Markdown, Plain Text) for personal academic review.

---

## 5. Permission Justifications (For Store Reviewers)

| Requested Permission | Justification for Reviewer |
| :--- | :--- |
| `activeTab` | Required to read the lecture video player DOM and extract transcript text only when the student explicitly clicks the extension popup. |
| `webNavigation` | Required to detect nested iframe player hierarchies inside Canvas LMS course modules without cross-origin DOM traversal. |
| `downloads` | Required to save the compiled `.pdf`, `.md`, and `.txt` lecture files directly to the user's computer. |
| `host_permissions` (`canvas.umich.edu`, `leccap.engin.umich.edu`, `*.kaltura.com`, `*.amazonaws.com`) | Scoped strictly to U-M course platforms to detect lecture players, and Amazon S3 to download the student's authorized slide frames for PDF compilation. |
| `data_collection_permissions` (`none`) | The extension collects 0 user data, stores 0 credentials, and operates 100% client-side in browser memory. |
