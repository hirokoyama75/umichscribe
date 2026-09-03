"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res, err) => function __init() {
    if (err) throw err[0];
    try {
      return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
    } catch (e) {
      throw err = [e], e;
    }
  };
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };

  // src/core/cleanup.ts
  function cleanupSegments(segments, options = {
    normalizeWhitespace: true,
    removeDuplicates: true,
    mergeAdjacent: true
  }) {
    if (segments.length === 0) return [];
    let result = [];
    for (const segment of segments) {
      let text = segment.text;
      if (options.normalizeWhitespace) {
        text = text.replace(/\s+/g, " ").trim();
      }
      if (!text) continue;
      const processedSegment = {
        ...segment,
        text
      };
      if (result.length === 0) {
        result.push(processedSegment);
        continue;
      }
      const last = result[result.length - 1];
      if (options.removeDuplicates && last.text === processedSegment.text) {
        if (last.speaker === processedSegment.speaker) {
          if (processedSegment.end !== void 0) {
            last.end = Math.max(last.end ?? processedSegment.end, processedSegment.end);
          }
          continue;
        }
      }
      if (options.mergeAdjacent && last.speaker === processedSegment.speaker) {
        const noTimestamps = last.end === void 0 && processedSegment.start === void 0;
        const veryClose = last.end !== void 0 && processedSegment.start !== void 0 && processedSegment.start - last.end <= 1;
        if (noTimestamps || veryClose) {
          last.text = `${last.text} ${processedSegment.text}`;
          if (processedSegment.end !== void 0) {
            last.end = processedSegment.end;
          }
          continue;
        }
      }
      result.push(processedSegment);
    }
    return result;
  }
  var init_cleanup = __esm({
    "src/core/cleanup.ts"() {
      "use strict";
    }
  });

  // src/core/ranges.ts
  function filterByRange(result, options) {
    const { startTime, endTime } = options;
    if (startTime === void 0 && endTime === void 0) {
      return result;
    }
    const segments = result.segments.filter((segment) => {
      if (segment.start === void 0) return true;
      if (startTime !== void 0 && segment.end !== void 0 && segment.end <= startTime) {
        return false;
      }
      if (startTime !== void 0 && segment.start < startTime) {
        if (segment.end !== void 0 && segment.end > startTime) {
        } else if (segment.end === void 0) {
          return false;
        }
      }
      if (endTime !== void 0 && segment.start >= endTime) {
        return false;
      }
      return true;
    });
    const markers = result.markers.filter((marker) => {
      if (startTime !== void 0 && marker.start < startTime) return false;
      if (endTime !== void 0 && marker.start >= endTime) return false;
      return true;
    });
    return {
      ...result,
      segments,
      markers
    };
  }
  var init_ranges = __esm({
    "src/core/ranges.ts"() {
      "use strict";
    }
  });

  // src/core/formatting.ts
  function formatTime(seconds) {
    if (seconds === void 0 || isNaN(seconds)) return "";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `[${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}]`;
    }
    return `[${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}]`;
  }
  function formatExport(result, options) {
    let output = "";
    if (options.format === "md") {
      if (result.lectureTitle) {
        output += `# ${result.lectureTitle}

`;
      } else {
        output += `# Lecture Transcript

`;
      }
      if (result.recordingDate) {
        output += `**Date:** ${result.recordingDate}

`;
      }
      if (options.includeSourceLink && options.sourceUrl) {
        output += `**Source:** [Link](${options.sourceUrl})

`;
      }
    } else {
      if (result.lectureTitle) {
        output += `${result.lectureTitle}
`;
        output += "=".repeat(result.lectureTitle.length) + "\n\n";
      } else {
        output += `Lecture Transcript
==================

`;
      }
      if (result.recordingDate) {
        output += `Date: ${result.recordingDate}

`;
      }
      if (options.includeSourceLink && options.sourceUrl) {
        output += `Source: ${options.sourceUrl}

`;
      }
    }
    const { segments, markers } = result;
    if (options.mode === "transcript") {
      output += formatSegments(segments, options);
    } else {
      let sIdx = 0;
      let mIdx = 0;
      while (sIdx < segments.length || mIdx < markers.length) {
        const sTime = sIdx < segments.length ? segments[sIdx].start ?? 0 : Infinity;
        const mTime = mIdx < markers.length ? markers[mIdx].start : Infinity;
        if (mTime <= sTime && mIdx < markers.length) {
          const marker = markers[mIdx];
          output += formatMarker(marker, options);
          mIdx++;
        } else {
          const segment = segments[sIdx];
          output += formatSegment(segment, options);
          sIdx++;
        }
      }
    }
    return output.trim() + "\n";
  }
  function formatSegments(segments, options) {
    return segments.map((s) => formatSegment(s, options)).join("");
  }
  function formatSegment(segment, options) {
    let line = "";
    if (options.includeTimestamps && segment.start !== void 0) {
      line += `${formatTime(segment.start)} `;
    }
    if (segment.speaker) {
      if (options.format === "md") {
        line += `**${segment.speaker}:** `;
      } else {
        line += `${segment.speaker}: `;
      }
    }
    line += `${segment.text}

`;
    return line;
  }
  function formatMarker(marker, options) {
    let block = "";
    if (options.format === "md") {
      const title = marker.title ? marker.title : marker.type === "slide" ? "Slide" : "Chapter";
      block += `## ${marker.type === "slide" ? "Slide" : "Chapter"}: ${title}
`;
      if (options.includeTimestamps) {
        block += `${formatTime(marker.start)}

`;
      } else {
        block += "\n";
      }
      if (marker.description || marker.text) {
        block += `**${marker.type === "slide" ? "Slide" : "Chapter"} context**

`;
        if (marker.description) {
          block += `${marker.description}

`;
        }
        if (marker.text) {
          block += `${marker.text}

`;
        }
      }
      block += `**Transcript**

`;
    } else {
      const title = marker.title ? marker.title : marker.type === "slide" ? "Slide" : "Chapter";
      block += `=== ${marker.type === "slide" ? "Slide" : "Chapter"}: ${title} ===
`;
      if (options.includeTimestamps) {
        block += `Time: ${formatTime(marker.start).replace("[", "").replace("]", "")}

`;
      } else {
        block += "\n";
      }
      if (marker.description || marker.text) {
        block += `${marker.type === "slide" ? "Slide" : "Chapter"} context:
`;
        if (marker.description) {
          block += `${marker.description}

`;
        }
        if (marker.text) {
          block += `${marker.text}

`;
        }
      }
      block += `Transcript:
`;
    }
    return block;
  }
  var init_formatting = __esm({
    "src/core/formatting.ts"() {
      "use strict";
    }
  });

  // src/core/filename.ts
  function sanitizeFilename(name) {
    let sanitized = name.replace(/[<>:"/\\|?*\x00-\x1F]/g, "-");
    sanitized = sanitized.replace(/\s+/g, " ").trim();
    if (sanitized.length > 100) {
      sanitized = sanitized.substring(0, 100).trim();
    }
    const reserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
    if (reserved.test(sanitized)) {
      sanitized = `file-${sanitized}`;
    }
    return sanitized || "lecture-transcript";
  }
  function generateFilename(title, date, mode, ext) {
    const parts = [];
    if (date) {
      parts.push(sanitizeFilename(date));
    }
    if (title) {
      parts.push(sanitizeFilename(title));
    }
    parts.push(mode === "ai_context" ? "AI Context" : "Transcript");
    let base = parts.join(" - ");
    if (parts.length === 1 && !title && !date) {
      const now = /* @__PURE__ */ new Date();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const hh = String(now.getHours()).padStart(2, "0");
      const min = String(now.getMinutes()).padStart(2, "0");
      base = `lecture-transcript-${now.getFullYear()}-${mm}-${dd}-${hh}${min}`;
    }
    return `${base}.${ext}`;
  }
  var init_filename = __esm({
    "src/core/filename.ts"() {
      "use strict";
    }
  });

  // src/popup/popup.ts
  var require_popup = __commonJS({
    "src/popup/popup.ts"() {
      init_cleanup();
      init_ranges();
      init_formatting();
      init_filename();
      var currentResult = null;
      var currentDiagnostics = null;
      async function requestExtraction() {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const activeTab = tabs[0];
        if (!activeTab || !activeTab.id) {
          showError("Cannot access active tab");
          return;
        }
        try {
          const frames = await new Promise((resolve) => {
            chrome.webNavigation.getAllFrames({ tabId: activeTab.id }, (res) => resolve(res || null));
          });
          if (!frames) {
            const response = await chrome.tabs.sendMessage(activeTab.id, { type: "EXTRACT_TRANSCRIPT" });
            handleResponse(response);
            return;
          }
          let bestResponse = null;
          for (const frame of frames) {
            try {
              const response = await chrome.tabs.sendMessage(activeTab.id, { type: "EXTRACT_TRANSCRIPT" }, { frameId: frame.frameId });
              if (response && response.status === "ready") {
                handleResponse(response);
                return;
              } else if (response) {
                bestResponse = response;
              }
            } catch (e) {
            }
          }
          if (bestResponse) {
            handleResponse(bestResponse);
          } else {
            showError("Could not connect to the page. Is this a supported lecture page?");
          }
        } catch (error) {
          showError("Could not connect to the page. Is this a supported lecture page?");
        }
      }
      function handleResponse(response) {
        if (response && response.status === "ready") {
          currentResult = response.result;
          currentDiagnostics = response.diagnostics;
          showExportPanel();
        } else {
          showError(response?.errorReason || "No transcript found on this page.");
          currentDiagnostics = response?.diagnostics;
        }
      }
      function showExportPanel() {
        document.getElementById("diagnostics-panel").classList.add("hidden");
        document.getElementById("export-panel").classList.remove("hidden");
        const badge = document.getElementById("status-badge");
        badge.textContent = "Ready";
        badge.className = "status-badge status-ready";
        if (currentResult) {
          document.getElementById("stats-display").textContent = `Segments: ${currentResult.segments.length} | Markers: ${currentResult.markers.length}`;
          updateFilename();
        }
      }
      function showError(msg) {
        document.getElementById("export-panel").classList.add("hidden");
        document.getElementById("diagnostics-panel").classList.remove("hidden");
        document.getElementById("status-message").textContent = msg;
        const badge = document.getElementById("status-badge");
        badge.textContent = "Error";
        badge.className = "status-badge status-error";
      }
      function updateFilename() {
        if (!currentResult) return;
        const mode = document.getElementById("mode-select").value;
        const format = document.getElementById("format-select").value;
        const name = generateFilename(currentResult.lectureTitle, currentResult.recordingDate, mode, format);
        document.getElementById("filename-input").value = name;
      }
      function getProcessedOutput() {
        if (!currentResult) return "";
        const mode = document.getElementById("mode-select").value;
        const format = document.getElementById("format-select").value;
        const includeTimestamps = document.getElementById("timestamps-check").checked;
        const doCleanup = document.getElementById("cleanup-check").checked;
        const startStr = document.getElementById("start-time").value;
        const endStr = document.getElementById("end-time").value;
        let result = currentResult;
        const startTime = startStr ? parseFloat(startStr) : void 0;
        const endTime = endStr ? parseFloat(endStr) : void 0;
        result = filterByRange(result, { startTime, endTime });
        if (doCleanup) {
          result = {
            ...result,
            segments: cleanupSegments(result.segments)
          };
        }
        return formatExport(result, {
          mode,
          format,
          includeTimestamps
        });
      }
      document.addEventListener("DOMContentLoaded", () => {
        requestExtraction();
        document.getElementById("mode-select").addEventListener("change", updateFilename);
        document.getElementById("format-select").addEventListener("change", updateFilename);
        document.getElementById("btn-copy").addEventListener("click", () => {
          const text = getProcessedOutput();
          navigator.clipboard.writeText(text).then(() => {
            const btn = document.getElementById("btn-copy");
            const old = btn.textContent;
            btn.textContent = "Copied!";
            setTimeout(() => btn.textContent = old, 2e3);
          });
        });
        document.getElementById("btn-download").addEventListener("click", () => {
          const text = getProcessedOutput();
          const filename = document.getElementById("filename-input").value || "transcript.txt";
          const blob = new Blob([text], { type: "text/plain" });
          const url = URL.createObjectURL(blob);
          chrome.downloads.download({
            url,
            filename,
            saveAs: true
          });
        });
        document.getElementById("btn-copy-diagnostics").addEventListener("click", () => {
          if (currentDiagnostics) {
            navigator.clipboard.writeText(JSON.stringify(currentDiagnostics, null, 2));
            const btn = document.getElementById("btn-copy-diagnostics");
            const old = btn.textContent;
            btn.textContent = "Copied!";
            setTimeout(() => btn.textContent = old, 2e3);
          }
        });
      });
    }
  });
  require_popup();
})();
