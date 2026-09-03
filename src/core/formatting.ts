import { ExtractionResult, TranscriptSegment, ContextMarker } from './types';

export interface FormatOptions {
  mode: 'transcript' | 'ai_context';
  format: 'md' | 'txt';
  includeTimestamps: boolean;
  includeSourceLink?: boolean;
  sourceUrl?: string; // sanitized URL if source link is enabled
}

export function formatTime(seconds?: number): string {
  if (seconds === undefined || isNaN(seconds)) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function formatExport(result: ExtractionResult, options: FormatOptions): string {
  let output = '';

  const title = result.courseName && result.lectureTitle 
    ? `${result.courseName} - ${result.lectureTitle}`
    : (result.courseName || result.lectureTitle || 'Lecture Transcript');

  // Header
  if (options.format === 'md') {
    output += `# ${title}\n\n`;
    if (result.recordingDate) {
      output += `**Date:** ${result.recordingDate}\n\n`;
    }
    if (options.includeSourceLink && options.sourceUrl) {
      output += `**Source:** [Link](${options.sourceUrl})\n\n`;
    }
    output += `---\n\n`;
  } else {
    output += `${title}\n`;
    output += '='.repeat(title.length) + '\n\n';
    if (result.recordingDate) {
      output += `Date: ${result.recordingDate}\n\n`;
    }
    if (options.includeSourceLink && options.sourceUrl) {
      output += `Source: ${options.sourceUrl}\n\n`;
    }
  }

  const { segments, markers } = result;

  if (options.mode === 'transcript' || markers.length === 0) {
    output += formatSegments(segments, options);
  } else {
    // AI Context mode: Interleave markers and segments by chronological timestamp
    // Ensure markers are sorted
    const sortedMarkers = [...markers].sort((a, b) => a.start - b.start);
    const sortedSegments = [...segments].sort((a, b) => (a.start ?? 0) - (b.start ?? 0));

    let sIdx = 0;
    let mIdx = 0;

    while (sIdx < sortedSegments.length || mIdx < sortedMarkers.length) {
      const sTime = sIdx < sortedSegments.length ? (sortedSegments[sIdx].start ?? 0) : Infinity;
      const mTime = mIdx < sortedMarkers.length ? sortedMarkers[mIdx].start : Infinity;

      if (mTime <= sTime && mIdx < sortedMarkers.length) {
        const marker = sortedMarkers[mIdx];
        output += formatMarker(marker, options);
        mIdx++;
      } else {
        const segment = sortedSegments[sIdx];
        output += formatSegment(segment, options);
        sIdx++;
      }
    }
  }

  return output.trim() + '\n';
}

function formatSegments(segments: TranscriptSegment[], options: FormatOptions): string {
  return segments.map(s => formatSegment(s, options)).join('');
}

function formatSegment(segment: TranscriptSegment, options: FormatOptions): string {
  let line = '';
  if (options.includeTimestamps && segment.start !== undefined) {
    line += `[${formatTime(segment.start)}] `;
  }
  if (segment.speaker) {
    if (options.format === 'md') {
      line += `**${segment.speaker}:** `;
    } else {
      line += `${segment.speaker}: `;
    }
  }
  line += `${segment.text}\n\n`;
  return line;
}

function formatMarker(marker: ContextMarker, options: FormatOptions): string {
  let block = '';
  const timeStr = formatTime(marker.start);
  const typeLabel = marker.type === 'slide' ? 'Slide' : 'Chapter';
  const headingTitle = marker.title || typeLabel;

  if (options.format === 'md') {
    block += `## ${headingTitle} [${timeStr}]\n\n`;
    
    if (marker.imageUrl) {
      block += `![${headingTitle}](${marker.imageUrl})\n\n`;
    }

    if (marker.description || marker.text) {
      block += `**${typeLabel} Context:**\n`;
      if (marker.description) {
        block += `${marker.description}\n\n`;
      }
      if (marker.text) {
        block += `${marker.text}\n\n`;
      }
    }
  } else {
    // Concise, clean plain text separator
    block += `=== ${headingTitle} (${timeStr}) ===\n`;
    
    if (marker.description || marker.text) {
      block += `[Context: `;
      const parts = [];
      if (marker.description) parts.push(marker.description);
      if (marker.text) parts.push(marker.text);
      block += parts.join(' | ') + `]\n`;
    }
    block += `\n`;
  }
  
  return block;
}
