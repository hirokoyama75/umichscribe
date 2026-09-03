import { describe, it, expect, vi, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { KalturaAdapter } from '../src/adapters/kaltura';
import { LeeCapAdapter } from '../src/adapters/leccap';
import fs from 'fs';
import path from 'path';

describe('KalturaAdapter', () => {
  const adapter = new KalturaAdapter();

  it('matches Kaltura URLs or player containers', () => {
    const dom = new JSDOM('<html><body><div class="kaltura-player-container"></div></body></html>');
    expect(adapter.isMatch('https://canvas.umich.edu/courses/123', dom.window.document)).toBe(true);
    expect(adapter.isMatch('https://www.kaltura.com/index.php', new JSDOM().window.document)).toBe(true);
    expect(adapter.isMatch('https://random.com', new JSDOM().window.document)).toBe(false);
  });

  it('extracts transcript segments from DOM fixture', async () => {
    const fixtureHtml = fs.readFileSync(path.join(__dirname, '../fixtures/kaltura.html'), 'utf-8');
    const dom = new JSDOM(fixtureHtml);

    const result = await adapter.extract(dom.window.document);
    expect(result).not.toBeNull();
    expect(result?.lectureTitle).toBe('Lecture 7: Direct Proofs');
    expect(result?.segments.length).toBe(2);
    expect(result?.segments[0].start).toBe(14.5);
    expect(result?.segments[0].end).toBe(20.0);
    expect(result?.segments[0].text).toContain('definition of an even integer');
  });
});

describe('LeeCapAdapter', () => {
  const adapter = new LeeCapAdapter();

  it('matches LecCap host URLs', () => {
    expect(adapter.isMatch('https://leccap.engin.umich.edu/leccap/player/r/abcdef123')).toBe(true);
    expect(adapter.isMatch('https://canvas.umich.edu')).toBe(false);
  });

  describe('Product API extraction', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('extracts high-res slide images and captions from LecCap product API', async () => {
      const mockApiResponse = {
        sitename: 'EECS 281 - Data Structures and Algorithms',
        title: 'Lecture 12 - Binary Trees',
        date: '09/02/2026',
        mediaPrefix: '//s3.amazonaws.com/leccap.engin.umich.edu/media/',
        sitekey: 'eecs281_f26',
        info: {
          slides_folder: 'slides',
          captions: [
            { intime: 0, outtime: 4.5, text: 'Welcome back to class.' },
            { intime: 5.0, outtime: 11.2, text: 'Today we discuss AVL trees.<br/>' }
          ],
          thumbnails: [
            [0, 0],
            [18, 125.5]
          ]
        }
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse
      } as any);

      const dom = new JSDOM('<html><body></body></html>', {
        url: 'https://leccap.engin.umich.edu/leccap/player/r/testrk123'
      });

      const originalWindow = global.window;
      global.window = dom.window as any;

      try {
        const result = await adapter.extract(dom.window.document);
        expect(result).not.toBeNull();
        expect(result?.courseName).toBe('EECS 281');
        expect(result?.lectureTitle).toBe('Lecture 12 - Binary Trees');
        expect(result?.recordingDate).toBe('2026-09-02');
        expect(result?.segments.length).toBe(2);
        expect(result?.segments[0].text).toBe('Welcome back to class.');
        expect(result?.segments[1].text).toBe('Today we discuss AVL trees.');

        expect(result?.markers.length).toBe(2);
        expect(result?.markers[0].imageUrl).toBe('https://s3.amazonaws.com/leccap.engin.umich.edu/media/eecs281_f26/slides/0.jpg');
        expect(result?.markers[1].imageUrl).toBe('https://s3.amazonaws.com/leccap.engin.umich.edu/media/eecs281_f26/slides/18.jpg');
        expect(result?.markers[1].start).toBe(125.5);
      } finally {
        global.window = originalWindow;
      }
    });

    it('compensates for LecCap thumbnail aria-label rounding bug in DOM fallback', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false } as any);

      const domHtml = `
        <html>
          <body>
            <div class="content-header-recording-title">EECS 370 Lecture 09/05/2026</div>
            <div class="transcript-row">
              <span class="transcript-time">00:10</span>
              <span class="transcript-text">Hello everyone</span>
            </div>
            <div class="thumbnails">
              <div class="thumbnail" role="listitem" aria-label="Thumbnail at 1 minute 35 second">
                <div style="background-image: url('//s3.amazonaws.com/leccap.engin.umich.edu/media/t18.jpg')"></div>
              </div>
              <div class="thumbnail" role="listitem" aria-label="Thumbnail at 2 minute 15 second">
                <div style="background-image: url('//s3.amazonaws.com/leccap.engin.umich.edu/media/t25.jpg')"></div>
              </div>
            </div>
          </body>
        </html>
      `;

      const dom = new JSDOM(domHtml, {
        url: 'https://leccap.engin.umich.edu/leccap/player/r/testrk123'
      });

      const originalWindow = global.window;
      global.window = dom.window as any;

      try {
        const result = await adapter.extract(dom.window.document);
        expect(result).not.toBeNull();
        expect(result?.markers.length).toBe(2);

        // First thumbnail: "1 minute 35 second" -> sec >= 30, min decremented: 0 min 35 sec = 35 seconds
        expect(result?.markers[0].start).toBe(35);
        // Upgraded from thumbnail t18.jpg to full 18.jpg
        expect(result?.markers[0].imageUrl).toBe('https://s3.amazonaws.com/leccap.engin.umich.edu/media/18.jpg');

        // Second thumbnail: "2 minute 15 second" -> sec < 30, 2*60 + 15 = 135 seconds
        expect(result?.markers[1].start).toBe(135);
        expect(result?.markers[1].imageUrl).toBe('https://s3.amazonaws.com/leccap.engin.umich.edu/media/25.jpg');
      } finally {
        global.window = originalWindow;
      }
    });
  });
});
