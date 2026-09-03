import { TranscriptSegment, ContextMarker, ExtractionResult } from './types';

export interface RangeOptions {
  startTime?: number; // seconds
  endTime?: number;   // seconds
}

/**
 * Filters segments and markers to those that intersect with the given time range.
 */
export function filterByRange(
  result: ExtractionResult,
  options: RangeOptions
): ExtractionResult {
  const { startTime, endTime } = options;

  if (startTime === undefined && endTime === undefined) {
    return result;
  }

  const segments = result.segments.filter(segment => {
    // If the segment has no timestamps, we keep it? 
    // Or drop it? Usually if there's a range, we filter by it.
    // If we can't tell, keep it.
    if (segment.start === undefined) return true;
    
    // Segment ends before our start time
    if (startTime !== undefined && segment.end !== undefined && segment.end <= startTime) {
      return false;
    }
    // Segment starts before our start time (but ends after, or end is undefined)
    // Actually, if it starts before startTime but ends after, it overlaps, so keep it.
    if (startTime !== undefined && segment.start < startTime) {
      if (segment.end !== undefined && segment.end > startTime) {
        // overlaps
      } else if (segment.end === undefined) {
        // we assume it's instantaneous or unknown, drop if strictly before
        return false;
      }
    }

    // Segment starts after our end time
    if (endTime !== undefined && segment.start >= endTime) {
      return false;
    }

    return true;
  });

  const markers = result.markers.filter(marker => {
    if (startTime !== undefined && marker.start < startTime) return false;
    if (endTime !== undefined && marker.start >= endTime) return false;
    return true;
  });

  return {
    ...result,
    segments,
    markers
  };
}
