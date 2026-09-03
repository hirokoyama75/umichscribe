# UMichScribe — Firefox AMO Store Listing

### Summary (Short Description)
Export synchronized U-M lecture transcripts and high-res slides into AI-ready PDFs and Markdown notes. 100% private and client-side.

---

### Description
UMichScribe is a privacy-first, open-source browser extension that extracts synchronized lecture transcripts and high-definition slide milestones from University of Michigan lecture recordings (LecCap, Kaltura, and Canvas LMS).

Designed for students who want to study efficiently or feed rich lecture context into modern multimodal AI models (Claude 3.5 Sonnet, ChatGPT-4o, and Gemini), UMichScribe pairs spoken instructor dialogue with the exact visual slide frame being discussed.

#### 🌟 Key Features
* 📄 **Embedded PDF Export (Best for AI Vision):** Embeds full-resolution 960×720 visual slide captures directly on each page alongside synchronized speech cues for multimodal AI inspection.
* 📝 **Markdown Export (.md):** Generates clean, beautifully formatted notes with `#` headers, slide timestamps, speaker cues, and embedded slide images for Obsidian and Notion.
* 📄 **Plain Text Export (.txt):** Pure, lightweight text formatted for universal scratchpads and fast copy-pasting.
* ⚡ **10× Fast Parallel Downloading:** Employs an asynchronous worker pool with concurrent connections to download 100+ slide frames in just 3 to 4 seconds.
* 🎯 **Smart Lecture Detection:** Automatically discovers course numbers and recording dates for effortless organization.
* ⏱️ **Time Range Filtering:** Filter by custom start and end timestamps to export specific problem walkthroughs.
* 🧹 **Conservative Caption Cleanup:** Intelligently merges fragmented captions and removes duplicate cues.

#### 🔒 Privacy & Permissions
* **100% Local & Client-Side:** Zero external servers, zero analytics, and zero cloud storage.
* **Minimal Permissions:** Uses `activeTab`, `webNavigation`, and `downloads` strictly to parse lecture players on screen and save files locally.
* **No Media Piracy:** Does not download video or audio streams. Operates only on authorized closed-caption interfaces and slide metadata you are currently viewing.

---

*Disclaimer: Unofficial tool created for student study efficiency. Not affiliated with, sponsored by, or endorsed by the University of Michigan, Instructure, or Kaltura. Requires authenticated student or faculty access to view recordings.*
