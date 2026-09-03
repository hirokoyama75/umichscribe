import { ExtractionResult, DiagnosticInfo } from '../core/types';
import { cleanupSegments } from '../core/cleanup';
import { filterByRange } from '../core/ranges';
import { formatExport } from '../core/formatting';
import { generateFilename } from '../core/filename';

let currentResult: ExtractionResult | null = null;
let currentDiagnostics: DiagnosticInfo | null = null;

async function requestExtraction() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs[0];
  
  if (!activeTab || !activeTab.id) {
    showError("Cannot access active tab");
    return;
  }

  try {
    const frames = await new Promise<chrome.webNavigation.GetAllFrameResultDetails[] | null>((resolve) => {
      chrome.webNavigation.getAllFrames({ tabId: activeTab.id! }, (res) => resolve(res || null));
    });

    if (!frames) {
      // Fallback
      const response = await chrome.tabs.sendMessage(activeTab.id, { type: 'EXTRACT_TRANSCRIPT' });
      handleResponse(response);
      return;
    }

    // Try all frames
    let bestResponse: any = null;
    
    for (const frame of frames) {
      try {
        const response = await chrome.tabs.sendMessage(activeTab.id, { type: 'EXTRACT_TRANSCRIPT' }, { frameId: frame.frameId });
        if (response && response.status === 'ready') {
          handleResponse(response);
          return;
        } else if (response) {
          bestResponse = response;
        }
      } catch (e) {
        // ignore inactive frames
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

function handleResponse(response: any) {
  if (response && response.status === 'ready') {
    currentResult = response.result;
    currentDiagnostics = response.diagnostics;
    showExportPanel();
  } else {
    showError(response?.errorReason || "No transcript found on this page.");
    currentDiagnostics = response?.diagnostics;
  }
}

function showExportPanel() {
  document.getElementById('diagnostics-panel')!.classList.add('hidden');
  document.getElementById('export-panel')!.classList.remove('hidden');
  
  const badge = document.getElementById('status-badge')!;
  badge.textContent = 'Ready';
  badge.className = 'status-badge status-ready';

  if (currentResult) {
    document.getElementById('stats-display')!.textContent = 
      `Segments: ${currentResult.segments.length} | Markers: ${currentResult.markers.length}`;
      
    updateFilename();
  }
}

function showError(msg: string) {
  document.getElementById('export-panel')!.classList.add('hidden');
  document.getElementById('diagnostics-panel')!.classList.remove('hidden');
  document.getElementById('status-message')!.textContent = msg;
  
  const badge = document.getElementById('status-badge')!;
  badge.textContent = 'Error';
  badge.className = 'status-badge status-error';
}

function updateFilename() {
  if (!currentResult) return;
  const mode = (document.getElementById('mode-select') as HTMLSelectElement).value as 'transcript' | 'ai_context';
  const format = (document.getElementById('format-select') as HTMLSelectElement).value as 'md' | 'txt';
  
  const name = generateFilename(currentResult.lectureTitle, currentResult.courseName, currentResult.recordingDate, mode, format);
  (document.getElementById('filename-input') as HTMLInputElement).value = name;
}

function getProcessedOutput(): string {
  if (!currentResult) return '';
  
  let mode = (document.getElementById('mode-select') as HTMLSelectElement).value as 'transcript' | 'ai_context';
  const format = (document.getElementById('format-select') as HTMLSelectElement).value as 'md' | 'txt';
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
  
  // Format
  return formatExport(result, {
    mode,
    format,
    includeTimestamps
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

  document.getElementById('btn-download')!.addEventListener('click', () => {
    const text = getProcessedOutput();
    let filename = (document.getElementById('filename-input') as HTMLInputElement).value || 'transcript.txt';
    // Ensure filename isn't absolutely empty
    if (!filename.trim()) filename = 'transcript.txt';

    // Use data URI to avoid Blob object URL issues in MV3
    const url = 'data:text/plain;charset=utf-8,' + encodeURIComponent(text);
    
    chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: true
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error("Download failed:", chrome.runtime.lastError.message);
        // Fallback: try removing saveAs or creating a temporary link
        if (chrome.runtime.lastError.message?.includes('filename')) {
           // Invalid filename fallback
           chrome.downloads.download({
              url: url,
              filename: 'transcript.txt',
              saveAs: true
           });
        }
      }
    });
  });

  document.getElementById('btn-copy-diagnostics')!.addEventListener('click', () => {
    if (currentDiagnostics) {
      navigator.clipboard.writeText(JSON.stringify(currentDiagnostics, null, 2));
      const btn = document.getElementById('btn-copy-diagnostics')!;
      const old = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = old, 2000);
    }
  });
});
