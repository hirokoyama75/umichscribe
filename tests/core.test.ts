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

describe('WebVTT Parser', () => {
  it('parses standard cues and extracts voice tags', async () => {
    const { parseVtt } = await import('../src/core/vtt');
    const vtt = `WEBVTT

1
00:00:14.500 --> 00:00:20.000
<v Instructor>So now we're going to use the definition of an even integer.

2
00:01:05.250 --> 00:01:10.800
Which we defined in the previous slide.
`;

    const segments = parseVtt(vtt);
    expect(segments.length).toBe(2);
    expect(segments[0].start).toBeCloseTo(14.5);
    expect(segments[0].end).toBeCloseTo(20.0);
    expect(segments[0].speaker).toBe('Instructor');
    expect(segments[0].text).toBe("So now we're going to use the definition of an even integer.");

    expect(segments[1].start).toBeCloseTo(65.25);
    expect(segments[1].end).toBeCloseTo(70.8);
    expect(segments[1].speaker).toBeUndefined();
    expect(segments[1].text).toBe('Which we defined in the previous slide.');
  });

  it('handles cues with hours and strips html markup', async () => {
    const { parseVtt } = await import('../src/core/vtt');
    const vtt = `WEBVTT

01:15:30.000 --> 01:15:35.500
<b>Important:</b> Check the <i>formula</i> on page 4.
`;
    const segments = parseVtt(vtt);
    expect(segments.length).toBe(1);
    expect(segments[0].start).toBe(4530);
    expect(segments[0].end).toBe(4535.5);
    expect(segments[0].text).toBe('Important: Check the formula on page 4.');
  });
});
