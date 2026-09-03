import { ExtractionResult, TranscriptSegment, ContextMarker } from './types';

export interface FormatOptions {
  mode: 'transcript' | 'ai_context';
  format: 'md' | 'txt';
  includeTimestamps: boolean;
  includeSourceLink?: boolean;
  sourceUrl?: string; // sanitized URL if source link is enabled
}

function formatTime(seconds?: number): string {
  if (seconds === undefined || isNaN(seconds)) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  if (h > 0) {
    return `[${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}]`;
  }
  return `[${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}]`;
}

export function formatExport(result: ExtractionResult, options: FormatOptions): string {
  let output = '';

  // Header
  if (options.format === 'md') {
    if (result.lectureTitle) {
      output += `# ${result.lectureTitle}\n\n`;
    } else {
      output += `# Lecture Transcript\n\n`;
    }
    if (result.recordingDate) {
      output += `**Date:** ${result.recordingDate}\n\n`;
    }
    if (options.includeSourceLink && options.sourceUrl) {
      output += `**Source:** [Link](${options.sourceUrl})\n\n`;
    }
  } else {
    if (result.lectureTitle) {
      output += `${result.lectureTitle}\n`;
      output += '='.repeat(result.lectureTitle.length) + '\n\n';
    } else {
      output += `Lecture Transcript\n==================\n\n`;
    }
    if (result.recordingDate) {
      output += `Date: ${result.recordingDate}\n\n`;
    }
    if (options.includeSourceLink && options.sourceUrl) {
      output += `Source: ${options.sourceUrl}\n\n`;
    }
  }

  const { segments, markers } = result;

  if (options.mode === 'transcript') {
    output += formatSegments(segments, options);
  } else {
    // AI Context mode
    // We interleave markers and segments by time
    // If multiple items have same time, markers go first
    let sIdx = 0;
    let mIdx = 0;

    while (sIdx < segments.length || mIdx < markers.length) {
      const sTime = sIdx < segments.length ? (segments[sIdx].start ?? 0) : Infinity;
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

  return output.trim() + '\n';
}

function formatSegments(segments: TranscriptSegment[], options: FormatOptions): string {
  return segments.map(s => formatSegment(s, options)).join('');
}

function formatSegment(segment: TranscriptSegment, options: FormatOptions): string {
  let line = '';
  if (options.includeTimestamps && segment.start !== undefined) {
    line += `${formatTime(segment.start)} `;
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
  
  if (options.format === 'md') {
    const title = marker.title ? marker.title : (marker.type === 'slide' ? 'Slide' : 'Chapter');
    block += `## ${marker.type === 'slide' ? 'Slide' : 'Chapter'}: ${title}\n`;
    if (options.includeTimestamps) {
      block += `${formatTime(marker.start)}\n\n`;
    } else {
      block += '\n';
    }
    
    if (marker.description || marker.text) {
      block += `**${marker.type === 'slide' ? 'Slide' : 'Chapter'} context**\n\n`;
      if (marker.description) {
        block += `${marker.description}\n\n`;
      }
      if (marker.text) {
        block += `${marker.text}\n\n`;
      }
    }
    
    block += `**Transcript**\n\n`;
  } else {
    const title = marker.title ? marker.title : (marker.type === 'slide' ? 'Slide' : 'Chapter');
    block += `=== ${marker.type === 'slide' ? 'Slide' : 'Chapter'}: ${title} ===\n`;
    if (options.includeTimestamps) {
      block += `Time: ${formatTime(marker.start).replace('[', '').replace(']', '')}\n\n`;
    } else {
      block += '\n';
    }
    
    if (marker.description || marker.text) {
      block += `${marker.type === 'slide' ? 'Slide' : 'Chapter'} context:\n`;
      if (marker.description) {
        block += `${marker.description}\n\n`;
      }
      if (marker.text) {
        block += `${marker.text}\n\n`;
      }
    }
    
    block += `Transcript:\n`;
  }
  
  return block;
}
