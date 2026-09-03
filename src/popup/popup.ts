import { ExtractionResult, DiagnosticInfo } from '../core/types';
import { cleanupSegments } from '../core/cleanup';
import { filterByRange } from '../core/ranges';
import { formatExport } from '../core/formatting';
import { generateFilename } from '../core/filename';
import { generatePdf } from '../core/pdf';

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
    const segEl = document.getElementById('stats-segments');
    if (segEl) segEl.textContent = `${currentResult.segments.length.toLocaleString()} Cues`;
    const markerEl = document.getElementById('stats-markers');
    if (markerEl) markerEl.textContent = `${currentResult.markers.length.toLocaleString()} Slides`;
      
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
        progressText.textContent = 'Initializing PDF...';

        const pdfBlob = await generatePdf(state.result, {
          mode: state.mode,
          format: 'txt',
          includeTimestamps: state.includeTimestamps
        }, (cur, total) => {
          const pct = Math.min(95, Math.round((cur / total) * 100));
          progressBar.style.width = `${pct}%`;
          progressText.textContent = `Embedding slide ${cur} of ${total}...`;
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
