# Privacy Policy for UMichScribe

**Last updated:** September 4, 2026

**UMichScribe** is an open-source browser extension developed by HiroK to help University of Michigan students study efficiently by exporting synchronized lecture transcripts and slide milestones into PDF, Markdown, and plain text notes.

We are committed to user privacy. This Privacy Policy details our principles and data practices.

---

## 1. Zero Data Collection

UMichScribe is strictly **100% private and client-side**:
* **No Personal Data Collected:** UMichScribe does not collect, record, log, or transmit any personally identifiable information (PII), student names, unique IDs, or course grades.
* **No Account Credentials Stored:** UMichScribe never accesses, reads, logs, or stores your University of Michigan credentials, passwords, or authentication cookies.
* **No Tracking or Analytics:** There are no tracking beacons, analytics scripts (e.g., Google Analytics, Mixpanel), telemetry, or third-party advertising SDKs inside the extension.
* **No Remote Servers:** UMichScribe runs entirely within your browser's local memory (`in-memory`). None of your extracted lecture text, captions, or downloaded slides are ever sent to an external server or cloud service operated by us.

---

## 2. Permissions & Why They Are Needed

In strict accordance with the Chrome Web Store and Mozilla Add-on Least Privilege policies, UMichScribe only requests the minimal set of permissions needed to provide its core study functionality:

| Permission | Purpose & Scope |
| :--- | :--- |
| `activeTab` | Grants temporary access to read closed captions and slide markers from the active lecture recording player only when you open the extension popup. |
| `webNavigation` | Required to query iframe hierarchies so the extension can locate embedded video players (such as Kaltura or LecCap) embedded inside Canvas LMS modules without cross-origin DOM violations. |
| `downloads` | Required to save your generated `.pdf`, `.md`, or `.txt` lecture study files directly to your local computer's download folder. |
| Host: `canvas.umich.edu` | Allows reading captions and lecture metadata on University of Michigan Canvas course pages. |
| Host: `leccap.engin.umich.edu` | Allows reading caption tracks and slide timing metadata on Michigan Engineering Lecture Capture players. |
| Host: `*.kaltura.com` | Allows reading caption tracks on embedded MiVideo / Kaltura lecture players. |
| Host: `s3.amazonaws.com` | Allows downloading the visual slide image frames stored on Amazon S3 by LecCap to embed them into your exported PDF notes. |

---

## 3. Data Storage and Retention

* **Ephemeral Memory:** All processing (caption merging, text formatting, and PDF compilation) takes place in browser memory during your active session.
* **Local Files Only:** When you click "Download", files are saved directly to your local file system via the standard browser download manager. UMichScribe does not retain copies or backups.

---

## 4. Open Source & Transparency

UMichScribe is completely open source under the MIT License. Anyone can inspect and audit the full source code and build process:
- GitHub Repository: [https://github.com/hirokoyama75/umichscribe](https://github.com/hirokoyama75/umichscribe)

---

## 5. Third-Party Services & Affiliation

UMichScribe is an independent study tool created for student academic review. It is not affiliated with, sponsored by, or endorsed by the University of Michigan, Instructure (Canvas), or Kaltura.

---

## 6. Contact & Inquiries

If you have any questions or feedback regarding this Privacy Policy, please open an issue on GitHub:
- [https://github.com/hirokoyama75/umichscribe/issues](https://github.com/hirokoyama75/umichscribe/issues)
