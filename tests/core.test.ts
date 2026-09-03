import { describe, it, expect } from 'vitest';
import { filterByRange } from '../src/core/ranges';
import { cleanupSegments } from '../src/core/cleanup';
import { formatExport } from '../src/core/formatting';
import { sanitizeFilename, generateFilename } from '../src/core/filename';
import { ExtractionResult, TranscriptSegment } from '../src/core/types';

describe('Ranges', () => {
  it('filters segments outside the time range', () => {
    const result: ExtractionResult = {
      segments: [
        { start: 0, end: 10, text: 'A' },
        { start: 10, end: 20, text: 'B' },
        { start: 20, end: 30, text: 'C' }
      ],
      markers: []
    };
    
    const filtered = filterByRange(result, { startTime: 10, endTime: 25 });
    expect(filtered.segments.length).toBe(2);
    expect(filtered.segments[0].text).toBe('B');
    expect(filtered.segments[1].text).toBe('C');
  });
});

describe('Cleanup', () => {
  it('merges adjacent segments from the same speaker', () => {
    const segments: TranscriptSegment[] = [
      { start: 0, end: 5, text: 'Hello', speaker: 'Inst' },
      { start: 5, end: 10, text: 'world', speaker: 'Inst' },
      { start: 10, end: 15, text: 'Wait', speaker: 'Other' }
    ];
    
    const cleaned = cleanupSegments(segments);
    expect(cleaned.length).toBe(2);
    expect(cleaned[0].text).toBe('Hello world');
    expect(cleaned[1].text).toBe('Wait');
  });
});

describe('Filename', () => {
  it('sanitizes titles', () => {
    expect(sanitizeFilename('Lecture 1: Intro / Setup?')).toBe('Lecture 1- Intro - Setup-');
    expect(sanitizeFilename('  Excessive   spaces  ')).toBe('Excessive spaces');
  });
  
  it('generates filename', () => {
    expect(generateFilename('Math 101', 'Math 101 Course', '2023-01-01', 'transcript', 'md')).toBe('Math 101 Course - 2023-01-01.md');
    expect(generateFilename('Math 101', undefined, undefined, 'transcript', 'md')).toBe('Math 101 - Transcript.md');
    expect(generateFilename('Math 101', 'Math 101 Course', '2023-01-01', 'ai_context', 'pdf')).toBe('Math 101 Course - 2023-01-01.pdf');
    expect(generateFilename(undefined, undefined, undefined, 'ai_context', 'txt')).toContain('umichscribe-transcript');
  });
});

describe('PDF Generation', () => {
  it('generates a valid PDF blob', async () => {
    const { generatePdf } = await import('../src/core/pdf');
    const result: ExtractionResult = {
      lectureTitle: 'Test Lecture',
      courseName: 'STATS 250',
      recordingDate: '2026-09-02',
      segments: [
        { start: 0, end: 10, text: 'Welcome to class' },
        { start: 10, end: 20, text: 'Here are the announcements' }
      ],
      markers: [
        { start: 0, type: 'slide', title: 'Slide 1' }
      ]
    };

    let progressCalls = 0;
    const blob = await generatePdf(result, {
      mode: 'ai_context',
      format: 'txt',
      includeTimestamps: true
    }, () => {
      progressCalls++;
    });

    expect(blob).toBeDefined();
    expect(blob.size).toBeGreaterThan(500);
    expect(progressCalls).toBeGreaterThan(0);
  });
});
