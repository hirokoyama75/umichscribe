import { ExtractionResult, TranscriptSegment, AdapterInfo, ContextMarker } from '../../core/types';

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

    // Try to get title from widget
    const titleEl = document.querySelector('.transcript-title, .titleLabel');
    if (titleEl) {
      lectureTitle = titleEl.textContent?.trim();
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
        // Fetch VTT (requires same-origin or CORS, which should be fine in content script if we have permission or if it's same-origin in iframe)
        const src = tracks[0].getAttribute('src');
        if (src) {
          try {
             // We return a status indicating loading is needed or handle it here.
             // For this adapter we will fetch the VTT text.
             const response = await fetch(src);
             const vttText = await response.text();
             const parsed = this.parseVtt(vttText);
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
      lectureTitle
    };
  }

  parseVtt(vtt: string): TranscriptSegment[] {
    const lines = vtt.split('\n');
    const segments: TranscriptSegment[] = [];
    let currentStart = 0;
    let currentEnd = 0;
    let currentText = [];
    let currentSpeaker: string | undefined;

    const timeRegex = /(?:(\d+):)?(\d+):(\d+\.\d+) --> (?:(\d+):)?(\d+):(\d+\.\d+)/;

    const pushCurrent = () => {
       if (currentText.length > 0) {
          let text = currentText.join('\n');
          // extract speaker if present e.g. <v Speaker>text
          const speakerMatch = text.match(/<v\s+([^>]+)>(.*)/s);
          if (speakerMatch) {
            currentSpeaker = speakerMatch[1];
            text = speakerMatch[2];
          }
          segments.push({
            start: currentStart,
            end: currentEnd,
            text: text.replace(/<[^>]+>/g, '').trim(),
            speaker: currentSpeaker
          });
          currentText = [];
          currentSpeaker = undefined;
       }
    };

    for (let line of lines) {
       line = line.trim();
       if (!line || line === 'WEBVTT' || /^\d+$/.test(line)) {
          // empty or index
          continue;
       }
       const timeMatch = line.match(timeRegex);
       if (timeMatch) {
          pushCurrent();
          
          const parseTime = (h: string, m: string, s: string) => {
            return (h ? parseInt(h) * 3600 : 0) + parseInt(m) * 60 + parseFloat(s);
          };
          
          currentStart = parseTime(timeMatch[1], timeMatch[2], timeMatch[3]);
          currentEnd = parseTime(timeMatch[4], timeMatch[5], timeMatch[6]);
       } else {
          currentText.push(line);
       }
    }
    pushCurrent();
    
    return segments;
  }
}
