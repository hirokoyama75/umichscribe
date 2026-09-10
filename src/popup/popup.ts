import { ExtractionResult, DiagnosticInfo } from '../core/types';
import { cleanupSegments } from '../core/cleanup';
import { filterByRange } from '../core/ranges';
import { formatExport } from '../core/formatting';
import { generateFilename } from '../core/filename';
import { generatePdf } from '../core/pdf';

let currentResult: ExtractionResult | null = null;
let currentDiagnostics: DiagnosticInfo | null = null;

async function queryFrames(tabId: number): Promise<chrome.webNavigation.GetAllFrameResultDetails[] | null> {
  return new Promise<chrome.webNavigation.GetAllFrameResultDetails[] | null>((resolve) => {
    chrome.webNavigation.getAllFrames({ tabId }, (res) => resolve(res || null));
  });
}

async function trySendExtraction(tabId: number): Promise<any> {
  const frames = await queryFrames(tabId);

  if (!frames) {
    try {
      return await chrome.tabs.sendMessage(tabId, { type: 'EXTRACT_TRANSCRIPT' });
    } catch {
      return null;
    }
  }

  let bestResponse: any = null;
  for (const frame of frames) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, { type: 'EXTRACT_TRANSCRIPT' }, { frameId: frame.frameId });
      if (response && response.status === 'ready') {
        return response;
      } else if (response) {
        bestResponse = response;
      }
    } catch {
      // ignore inactive frames
    }
  }
  return bestResponse;
}

async function injectContentScript(tabId: number): Promise<boolean> {
  try {
    if (chrome.scripting && chrome.scripting.executeScript) {
      await chrome.scripting.executeScript({
        target: { tabId, allFrames: true },
        files: ['content/index.js']
      });
      return true;
    }
  } catch {
    // Restricted or unsupported page
  }
  return false;
}

async function requestExtraction() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs[0];
  
  if (!activeTab || !activeTab.id) {
    showError("Cannot access active tab");
    return;
  }

  try {
    let response = await trySendExtraction(activeTab.id);

    // If no frame responded, tab may have been opened before extension install/update.
    // Attempt just-in-time programmatic injection and retry.
    if (!response) {
      const injected = await injectContentScript(activeTab.id);
      if (injected) {
        response = await trySendExtraction(activeTab.id);
      }
    }

    if (response) {
      handleResponse(response, activeTab);
    } else {
      showError("Could not connect to the page. Is this a supported lecture page?", activeTab);
    }
  } catch (error) {
    showError("Could not connect to the page. Is this a supported lecture page?", activeTab);
  }
}

function handleResponse(response: any, tab?: chrome.tabs.Tab) {
  if (response && response.status === 'ready') {
    currentResult = response.result;
    currentDiagnostics = response.diagnostics;
    showExportPanel();
  } else {
    currentDiagnostics = response?.diagnostics || null;
    showError(response?.errorReason || "No transcript found on this page.", tab);
  }
}

function showExportPanel() {
  document.getElementById('diagnostics-panel')!.classList.add('hidden');
  document.getElementById('export-panel')!.classList.remove('hidden');
  
  const badge = document.getElementById('status-badge')!;
  badge.textContent = 'Ready';
  badge.className = 'status-badge status-ready';

  if (currentResult) {
    const segEl = document.getElementById('stats-segments');
    if (segEl) segEl.textContent = `${currentResult.segments.length.toLocaleString()} Cues`;
    const markerEl = document.getElementById('stats-markers');
    if (markerEl) markerEl.textContent = `${currentResult.markers.length.toLocaleString()} Slides`;
      
    updateFilename();
  }
}

function showError(msg: string, tab?: chrome.tabs.Tab) {
  document.getElementById('export-panel')!.classList.add('hidden');
  document.getElementById('diagnostics-panel')!.classList.remove('hidden');
  document.getElementById('status-message')!.textContent = msg;
  
  const badge = document.getElementById('status-badge')!;
  badge.textContent = 'Error';
  badge.className = 'status-badge status-error';

  if (!currentDiagnostics) {
    let hostname = 'unknown';
    if (tab?.url) {
      try {
        hostname = new URL(tab.url).hostname;
      } catch {
        hostname = tab.url;
      }
    }
    currentDiagnostics = {
      version: chrome.runtime.getManifest().version,
      browser: navigator.userAgent,
      adapterPlatform: 'none',
      urlPattern: hostname,
      status: 'error',
      errorCode: msg,
      segmentCount: 0,
      markerCount: 0,
      isFrame: false,
      dynamicLoading: false
    };
  }
}

function updateFilename() {
  if (!currentResult) return;
  const mode = (document.getElementById('mode-select') as HTMLSelectElement).value as 'transcript' | 'ai_context';
  const format = (document.getElementById('format-select') as HTMLSelectElement).value as 'md' | 'txt' | 'pdf';
  
  const name = generateFilename(currentResult.lectureTitle, currentResult.courseName, currentResult.recordingDate, mode, format);
  (document.getElementById('filename-input') as HTMLInputElement).value = name;
}

function getProcessedState() {
  if (!currentResult) return null;
  
  let mode = (document.getElementById('mode-select') as HTMLSelectElement).value as 'transcript' | 'ai_context';
  const format = (document.getElementById('format-select') as HTMLSelectElement).value as 'md' | 'txt' | 'pdf';
  const includeTimestamps = (document.getElementById('timestamps-check') as HTMLInputElement).checked;
  const doCleanup = (document.getElementById('cleanup-check') as HTMLInputElement).checked;
  
  const startStr = (document.getElementById('start-time') as HTMLInputElement).value;
  const endStr = (document.getElementById('end-time') as HTMLInputElement).value;
  
  let result = currentResult;
  
  // Range
  const startTime = startStr ? parseFloat(startStr) : undefined;
  const endTime = endStr ? parseFloat(endStr) : undefined;
  result = filterByRange(result, { startTime, endTime });
  
  // AI Context fallback
  if (mode === 'ai_context' && result.markers.length === 0) {
    mode = 'transcript';
  }
  
  // Cleanup
  if (doCleanup) {
    result = {
      ...result,
      segments: cleanupSegments(result.segments)
    };
  }

  return { result, mode, format, includeTimestamps };
}

function getProcessedOutput(): string {
  const state = getProcessedState();
  if (!state) return '';
  
  const textFormat = state.format === 'pdf' ? 'md' : state.format;
  return formatExport(state.result, {
    mode: state.mode,
    format: textFormat,
    includeTimestamps: state.includeTimestamps
  });
}

document.addEventListener('DOMContentLoaded', () => {
  requestExtraction();
  
  // Event listeners to update filename when mode/format change
  document.getElementById('mode-select')!.addEventListener('change', updateFilename);
  document.getElementById('format-select')!.addEventListener('change', updateFilename);
  
  document.getElementById('btn-copy')!.addEventListener('click', () => {
    const text = getProcessedOutput();
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById('btn-copy')!;
      const old = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = old, 2000);
    });
  });

  document.getElementById('btn-download')!.addEventListener('click', async () => {
    const state = getProcessedState();
    if (!state) return;

    let filename = (document.getElementById('filename-input') as HTMLInputElement).value;
    if (!filename.trim()) {
      filename = state.format === 'pdf' ? 'lecture.pdf' : (state.format === 'md' ? 'lecture.md' : 'lecture.txt');
    }

    const downloadBtn = document.getElementById('btn-download') as HTMLButtonElement;
    const oldBtnText = downloadBtn.textContent;

    if (state.format === 'pdf') {
      const progressContainer = document.getElementById('pdf-progress-container')!;
      const progressBar = document.getElementById('pdf-progress-bar')!;
      const progressText = document.getElementById('pdf-progress-text')!;

      try {
        downloadBtn.disabled = true;
        progressContainer.classList.remove('hidden');
        progressBar.style.width = '10%';
        progressText.textContent = 'Downloading slides (parallel)...';

        const pdfBlob = await generatePdf(state.result, {
          mode: state.mode,
          format: 'txt',
          includeTimestamps: state.includeTimestamps
        }, (cur, total, phase) => {
          const pct = Math.min(95, Math.round((cur / total) * 100));
          progressBar.style.width = `${pct}%`;
          progressText.textContent = phase === 'fetching'
            ? `Downloading slides (${cur}/${total})...`
            : `Embedding slide ${cur} of ${total} in PDF...`;
        });

        progressBar.style.width = '100%';
        progressText.textContent = 'PDF generated!';

        const blobUrl = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
          progressContainer.classList.add('hidden');
        }, 3000);

        downloadBtn.textContent = 'Downloaded!';
        setTimeout(() => {
          downloadBtn.textContent = oldBtnText;
          downloadBtn.disabled = false;
        }, 2000);
      } catch (err) {
        console.error("PDF generation failed:", err);
        progressText.textContent = 'PDF export failed. Try Markdown.';
        downloadBtn.disabled = false;
      }
    } else {
      // Fast text/markdown download
      const text = getProcessedOutput();
      const mime = filename.endsWith('.md') ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8';
      const blob = new Blob([text], { type: mime });
      const blobUrl = URL.createObjectURL(blob);

      try {
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
        }, 5000);

        downloadBtn.textContent = 'Downloaded!';
        setTimeout(() => downloadBtn.textContent = oldBtnText, 2000);
      } catch (e) {
        chrome.downloads.download({
          url: blobUrl,
          filename: filename,
          saveAs: true
        });
      }
    }
  });

  function fallbackCopyText(text: string): boolean {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    return successful;
  }

  document.getElementById('btn-copy-diagnostics')!.addEventListener('click', async () => {
    const btn = document.getElementById('btn-copy-diagnostics')!;
    const oldText = btn.textContent || 'Copy Diagnostics';

    const diagToCopy = currentDiagnostics || {
      version: chrome.runtime.getManifest().version,
      browser: navigator.userAgent,
      adapterPlatform: 'none',
      urlPattern: 'unknown',
      status: 'error',
      errorCode: 'No diagnostic information available',
      segmentCount: 0,
      markerCount: 0,
      isFrame: false,
      dynamicLoading: false
    };

    const text = JSON.stringify(diagToCopy, null, 2);
    let copied = false;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        copied = true;
      } else {
        copied = fallbackCopyText(text);
      }
    } catch {
      try {
        copied = fallbackCopyText(text);
      } catch {
        copied = false;
      }
    }

    if (copied) {
      btn.textContent = 'Copied!';
    } else {
      btn.textContent = 'Copy Failed';
    }
    setTimeout(() => {
      btn.textContent = oldText;
    }, 2000);
  });
});
