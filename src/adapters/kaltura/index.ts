import { ExtractionResult, TranscriptSegment, ContextMarker } from '../../core/types';
import { parseVtt } from '../../core/vtt';

export class KalturaAdapter {
  platform = "Kaltura/MiVideo";

  isMatch(url: string, document: Document): boolean {
    return url.includes('kaltura') || 
           document.querySelector('.kaltura-player-container, [id^="kaltura_player_"]') !== null;
  }

  async extract(document: Document): Promise<ExtractionResult | null> {
    const segments: TranscriptSegment[] = [];
    const markers: ContextMarker[] = [];
    let lectureTitle: string | undefined;
    let courseName: string | undefined;

    // Try to get title from widget
    const titleEl = document.querySelector('.transcript-title, .titleLabel');
    if (titleEl) {
      lectureTitle = titleEl.textContent?.trim();
    }
    
    // Try to get course name
    const courseEl = document.querySelector('.course-name, .header-title');
    if (courseEl) {
      courseName = courseEl.textContent?.trim();
    }

    // Attempt DOM extraction first
    const domSegments = document.querySelectorAll('.segment, .cue, .transcript-line');
    if (domSegments.length > 0) {
      domSegments.forEach(el => {
        const text = el.textContent?.trim();
        if (!text) return;
        const startAttr = el.getAttribute('data-start') || el.getAttribute('data-time');
        const endAttr = el.getAttribute('data-end');
        
        segments.push({
          start: startAttr ? parseFloat(startAttr) : undefined,
          end: endAttr ? parseFloat(endAttr) : undefined,
          text: text
        });
      });
    }

    // If DOM extraction yields nothing, look for VTT tracks
    if (segments.length === 0) {
      const tracks = document.querySelectorAll('track[kind="captions"], track[kind="subtitles"]');
      if (tracks.length > 0) {
        const src = tracks[0].getAttribute('src');
        if (src) {
          try {
             const response = await fetch(src);
             const vttText = await response.text();
             const parsed = parseVtt(vttText);
             segments.push(...parsed);
          } catch (e) {
             console.error("Kaltura Adapter: Failed to fetch VTT", e);
          }
        }
      }
    }

    if (segments.length === 0) return null;

    return {
      segments,
      markers,
      lectureTitle,
      courseName
    };
  }
}
