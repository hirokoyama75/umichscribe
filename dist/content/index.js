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

  // src/adapters/kaltura/index.ts
  var KalturaAdapter;
  var init_kaltura = __esm({
    "src/adapters/kaltura/index.ts"() {
      "use strict";
      KalturaAdapter = class {
        platform = "Kaltura/MiVideo";
        isMatch(url, document2) {
          return url.includes("kaltura") || document2.querySelector('.kaltura-player-container, [id^="kaltura_player_"]') !== null;
        }
        async extract(document2) {
          const segments = [];
          const markers = [];
          let lectureTitle;
          const titleEl = document2.querySelector(".transcript-title, .titleLabel");
          if (titleEl) {
            lectureTitle = titleEl.textContent?.trim();
          }
          const domSegments = document2.querySelectorAll(".segment, .cue, .transcript-line");
          if (domSegments.length > 0) {
            domSegments.forEach((el) => {
              const text = el.textContent?.trim();
              if (!text) return;
              const startAttr = el.getAttribute("data-start") || el.getAttribute("data-time");
              const endAttr = el.getAttribute("data-end");
              segments.push({
                start: startAttr ? parseFloat(startAttr) : void 0,
                end: endAttr ? parseFloat(endAttr) : void 0,
                text
              });
            });
          }
          if (segments.length === 0) {
            const tracks = document2.querySelectorAll('track[kind="captions"], track[kind="subtitles"]');
            if (tracks.length > 0) {
              const src = tracks[0].getAttribute("src");
              if (src) {
                try {
                  const response = await fetch(src);
                  const vttText = await response.text();
                  const parsed = this.parseVtt(vttText);
                  segments.push(...parsed);
                } catch (e) {
                  console.error("Kaltura Adapter: Failed to fetch VTT", e);
                }
              }
            }
          }
          if (segments.length === 0) return null;
          return {
            segments,
            markers,
            lectureTitle
          };
        }
        parseVtt(vtt) {
          const lines = vtt.split("\n");
          const segments = [];
          let currentStart = 0;
          let currentEnd = 0;
          let currentText = [];
          let currentSpeaker;
          const timeRegex = /(?:(\d+):)?(\d+):(\d+\.\d+) --> (?:(\d+):)?(\d+):(\d+\.\d+)/;
          const pushCurrent = () => {
            if (currentText.length > 0) {
              let text = currentText.join("\n");
              const speakerMatch = text.match(/<v\s+([^>]+)>(.*)/s);
              if (speakerMatch) {
                currentSpeaker = speakerMatch[1];
                text = speakerMatch[2];
              }
              segments.push({
                start: currentStart,
                end: currentEnd,
                text: text.replace(/<[^>]+>/g, "").trim(),
                speaker: currentSpeaker
              });
              currentText = [];
              currentSpeaker = void 0;
            }
          };
          for (let line of lines) {
            line = line.trim();
            if (!line || line === "WEBVTT" || /^\d+$/.test(line)) {
              continue;
            }
            const timeMatch = line.match(timeRegex);
            if (timeMatch) {
              pushCurrent();
              const parseTime = (h, m, s) => {
                return (h ? parseInt(h) * 3600 : 0) + parseInt(m) * 60 + parseFloat(s);
              };
              currentStart = parseTime(timeMatch[1], timeMatch[2], timeMatch[3]);
              currentEnd = parseTime(timeMatch[4], timeMatch[5], timeMatch[6]);
            } else {
              currentText.push(line);
            }
          }
          pushCurrent();
          return segments;
        }
      };
    }
  });

  // src/adapters/leccap/index.ts
  var LeeCapAdapter;
  var init_leccap = __esm({
    "src/adapters/leccap/index.ts"() {
      "use strict";
      LeeCapAdapter = class {
        platform = "LeeCap";
        isMatch(url) {
          return url.includes("leccap.engin.umich.edu");
        }
        async extract(document2) {
          const segments = [];
          const markers = [];
          let lectureTitle;
          let recordingDate;
          const titleEl = document2.querySelector(".lecture-title, h1");
          if (titleEl) {
            lectureTitle = titleEl.textContent?.trim();
          }
          const dateEl = document2.querySelector(".lecture-date, .date");
          if (dateEl) {
            recordingDate = dateEl.textContent?.trim();
          }
          const cueElements = document2.querySelectorAll(".transcript-cue, .transcript-row, .caption-cue");
          cueElements.forEach((el) => {
            const textEl = el.querySelector(".text, .cue-text") || el;
            const text = textEl.textContent?.trim();
            if (!text) return;
            const timeAttr = el.getAttribute("data-time") || el.getAttribute("data-start");
            let start;
            if (timeAttr) {
              start = parseFloat(timeAttr);
            } else {
              const timeText = el.querySelector(".time")?.textContent?.trim();
              if (timeText) {
                const parts = timeText.split(":");
                if (parts.length === 3) {
                  start = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2]);
                } else if (parts.length === 2) {
                  start = parseInt(parts[0]) * 60 + parseFloat(parts[1]);
                }
              }
            }
            const speakerEl = el.querySelector(".speaker");
            const speaker = speakerEl ? speakerEl.textContent?.trim() : void 0;
            segments.push({
              start,
              text,
              speaker
            });
          });
          const slideElements = document2.querySelectorAll(".slide, .chapter-marker");
          slideElements.forEach((el) => {
            const timeAttr = el.getAttribute("data-time");
            if (!timeAttr) return;
            const start = parseFloat(timeAttr);
            const title = el.querySelector(".title, .slide-title")?.textContent?.trim();
            const text = el.querySelector(".slide-text")?.textContent?.trim();
            markers.push({
              start,
              type: el.classList.contains("slide") ? "slide" : "chapter",
              title,
              text
            });
          });
          if (segments.length === 0 && markers.length === 0) return null;
          return {
            segments,
            markers,
            lectureTitle,
            recordingDate
          };
        }
      };
    }
  });

  // src/adapters/canvas/index.ts
  var CanvasAdapter;
  var init_canvas = __esm({
    "src/adapters/canvas/index.ts"() {
      "use strict";
      CanvasAdapter = class {
        platform = "Canvas";
        isMatch(url) {
          return url.includes("instructure.com") || url.includes("canvas.");
        }
        setupNavigationListener(onNavigate) {
          let lastUrl = location.href;
          const observer = new MutationObserver(() => {
            if (location.href !== lastUrl) {
              lastUrl = location.href;
              onNavigate();
            }
          });
          observer.observe(document.body, { childList: true, subtree: true });
          window.addEventListener("popstate", () => {
            if (location.href !== lastUrl) {
              lastUrl = location.href;
              onNavigate();
            }
          });
        }
      };
    }
  });

  // src/content/index.ts
  var require_index = __commonJS({
    "src/content/index.ts"() {
      init_kaltura();
      init_leccap();
      init_canvas();
      var adapters = [
        new KalturaAdapter(),
        new LeeCapAdapter(),
        new CanvasAdapter()
      ];
      var lastResult = null;
      var currentDiagnostic = {
        version: "1.0.0",
        browser: "unknown",
        adapterPlatform: "none",
        urlPattern: location.hostname,
        status: "unsupported",
        segmentCount: 0,
        markerCount: 0,
        isFrame: window !== window.top,
        dynamicLoading: false
      };
      var canvasAdapter = new CanvasAdapter();
      if (canvasAdapter.isMatch(location.href)) {
        canvasAdapter.setupNavigationListener(() => {
          lastResult = null;
          currentDiagnostic.status = "unsupported";
        });
      }
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type === "EXTRACT_TRANSCRIPT") {
          handleExtraction().then(sendResponse);
          return true;
        }
      });
      async function handleExtraction() {
        const url = location.href;
        let activeAdapter = null;
        for (const adapter of adapters) {
          if (adapter.isMatch(url, document)) {
            activeAdapter = adapter;
            break;
          }
        }
        currentDiagnostic.urlPattern = location.hostname;
        if (!activeAdapter) {
          currentDiagnostic.status = "unsupported";
          return {
            status: "unsupported",
            errorReason: "This page does not appear to be a supported lecture platform.",
            diagnostics: currentDiagnostic
          };
        }
        currentDiagnostic.adapterPlatform = activeAdapter.platform;
        if (typeof activeAdapter.extract === "function") {
          try {
            const result = await activeAdapter.extract(document);
            if (result) {
              lastResult = result;
              currentDiagnostic.status = "ready";
              currentDiagnostic.segmentCount = result.segments.length;
              currentDiagnostic.markerCount = result.markers.length;
              return {
                status: "ready",
                result,
                diagnostics: currentDiagnostic
              };
            } else {
              currentDiagnostic.status = "supported_no_transcript";
              return {
                status: "supported_no_transcript",
                errorReason: "Supported platform detected, but no transcript was found. Ensure the transcript panel is open or captions are available.",
                diagnostics: currentDiagnostic
              };
            }
          } catch (e) {
            currentDiagnostic.status = "error";
            currentDiagnostic.errorCode = e.message;
            return {
              status: "error",
              errorReason: "An error occurred while extracting the transcript.",
              diagnostics: currentDiagnostic
            };
          }
        } else {
          currentDiagnostic.status = "supported_no_transcript";
          return {
            status: "supported_no_transcript",
            errorReason: "Canvas detected. If there is a video player, it may be in a frame. (Try opening the video directly if possible, or wait for the frame to load).",
            diagnostics: currentDiagnostic
          };
        }
      }
    }
  });
  require_index();
})();
