import { TranscriptSegment } from './types';

export interface CleanupOptions {
  normalizeWhitespace?: boolean;
  removeDuplicates?: boolean;
  mergeAdjacent?: boolean;
}

export function cleanupSegments(
  segments: TranscriptSegment[],
  options: CleanupOptions = {
    normalizeWhitespace: true,
    removeDuplicates: true,
    mergeAdjacent: true,
  }
): TranscriptSegment[] {
  if (segments.length === 0) return [];

  let result: TranscriptSegment[] = [];

  for (const segment of segments) {
    let text = segment.text;
    
    if (options.normalizeWhitespace) {
      text = text.replace(/\s+/g, ' ').trim();
    }
    
    if (!text) continue; // Skip empty segments

    const processedSegment: TranscriptSegment = {
      ...segment,
      text
    };

    if (result.length === 0) {
      result.push(processedSegment);
      continue;
    }

    const last = result[result.length - 1];

    if (options.removeDuplicates && last.text === processedSegment.text) {
      // Check if it's temporally close or overlapping
      // For now, if the text is exactly the same, we consider it a duplicate, especially if speaker is same.
      if (last.speaker === processedSegment.speaker) {
        // Expand the time range of the last segment to include this one
        if (processedSegment.end !== undefined) {
           last.end = Math.max(last.end ?? processedSegment.end, processedSegment.end);
        }
        continue;
      }
    }

    if (options.mergeAdjacent && last.speaker === processedSegment.speaker) {
      // Merge if they are very close in time or if there are no timestamps
      const noTimestamps = last.end === undefined && processedSegment.start === undefined;
      const veryClose = last.end !== undefined && processedSegment.start !== undefined && (processedSegment.start - last.end <= 1.0);
      
      // Also merge if they end with incomplete sentences and start with lowercase? 
      // The prompt says "Merge clearly adjacent transcript fragments".
      if (noTimestamps || veryClose) {
        last.text = `${last.text} ${processedSegment.text}`;
        if (processedSegment.end !== undefined) {
          last.end = processedSegment.end;
        }
        continue;
      }
    }

    result.push(processedSegment);
  }

  return result;
}
