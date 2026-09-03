import { KalturaAdapter } from '../adapters/kaltura';
import { LeeCapAdapter } from '../adapters/leccap';
import { CanvasAdapter } from '../adapters/canvas';
import { DiagnosticInfo } from '../core/types';

const adapters = [
  new KalturaAdapter(),
  new LeeCapAdapter(),
  new CanvasAdapter()
];

let lastResult: any = null;
let currentDiagnostic: DiagnosticInfo = {
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

// Canvas SPA support
const canvasAdapter = new CanvasAdapter();
if (canvasAdapter.isMatch(location.href)) {
  canvasAdapter.setupNavigationListener(() => {
    // When canvas navigates, we reset our state
    lastResult = null;
    currentDiagnostic.status = "unsupported";
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'EXTRACT_TRANSCRIPT') {
    handleExtraction().then(sendResponse);
    return true; // async
  }
});

async function handleExtraction() {
  const url = location.href;
  let activeAdapter = null;

  for (const adapter of adapters) {
    // For Canvas adapter, it doesn't extract itself usually, but let's check
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

  if (typeof (activeAdapter as any).extract === 'function') {
    try {
      const result = await (activeAdapter as any).extract(document);
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
    } catch (e: any) {
      currentDiagnostic.status = "error";
      currentDiagnostic.errorCode = e.message;
      return {
         status: "error",
         errorReason: "An error occurred while extracting the transcript.",
         diagnostics: currentDiagnostic
      };
    }
  } else {
    // Canvas adapter for example might just be a host.
    // If we are in Canvas, the actual player might be in an iframe. 
    // The iframe should respond to a broadcast if we message it, or the popup messages all frames.
    // However, if the popup sends to activeTab, it goes to the top frame by default unless it queries all frames.
    // We should tell the user that the player is in an iframe.
    currentDiagnostic.status = "supported_no_transcript";
    return {
      status: "supported_no_transcript",
      errorReason: "Canvas detected. If there is a video player, it may be in a frame. (Try opening the video directly if possible, or wait for the frame to load).",
      diagnostics: currentDiagnostic
    };
  }
}

