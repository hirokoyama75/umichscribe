import { ExtractionResult, TranscriptSegment, ContextMarker } from '../../core/types';
import { parseVtt } from '../../core/vtt';

export class LeeCapAdapter {
  platform = "LeeCap";

  isMatch(url: string): boolean {
    return url.includes('leccap.engin.umich.edu');
  }

  async extract(document: Document): Promise<ExtractionResult | null> {
    const url = window.location.href;
    const rkMatch = url.match(/\/player\/r\/([^/?#]+)/);
    const rk = rkMatch ? rkMatch[1] : null;

    let lectureTitle: string | undefined;
    let recordingDate: string | undefined;
    let courseName: string | undefined;
    let segments: TranscriptSegment[] = [];
    let markers: ContextMarker[] = [];

    // 1. Primary Strategy: LecCap Product API
    if (rk) {
      try {
        const apiUrl = `/leccap/player/api/product/?rk=${encodeURIComponent(rk)}`;
        const res = await fetch(apiUrl);
        if (res.ok) {
          const data = await res.json();
          if (data && data.info) {
            // Course Name
            if (data.sitename) {
              const m = data.sitename.match(/([A-Z]{2,}\s+\d{3})/i);
              courseName = m ? m[1].toUpperCase() : data.sitename.split('-')[0].trim();
            }

            // Title
            if (data.title) {
              lectureTitle = data.title;
            }

            // Date
            if (data.date) {
              const dm = data.date.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
              if (dm) {
                recordingDate = `${dm[3]}-${dm[1].padStart(2, '0')}-${dm[2].padStart(2, '0')}`;
              } else {
                recordingDate = data.date;
              }
            }

            // Captions / Transcript
            if (Array.isArray(data.info.captions) && data.info.captions.length > 0) {
              segments = data.info.captions.map((c: any) => ({
                start: typeof c.intime === 'number' ? c.intime : parseFloat(c.intime),
                end: typeof c.outtime === 'number' ? c.outtime : parseFloat(c.outtime),
                text: String(c.text || '').replace(/<br\s*\/?>/gi, ' ').trim()
              })).filter((s: TranscriptSegment) => !!s.text);
            }

            // Slide Thumbnails / Boundaries
            if (Array.isArray(data.info.thumbnails) && data.info.thumbnails.length > 0) {
              const prefix = data.mediaPrefix || '//s3.amazonaws.com/leccap.engin.umich.edu/media/';
              const sitekey = data.sitekey || '';
              const thumbFolder = data.info.thumbnails_folder || data.info.slides_folder || '';
              
              markers = data.info.thumbnails.map((t: any, idx: number) => {
                const imgNum = t[0];
                const timeSec = typeof t[1] === 'number' ? t[1] : parseFloat(t[1]);
                let imageUrl: string | undefined;
                if (thumbFolder) {
                  imageUrl = `https:${prefix}${sitekey}/${thumbFolder}/t${imgNum}.jpg`;
                }
                return {
                  start: timeSec,
                  type: 'slide' as const,
                  title: `Slide ${idx + 1}`,
                  imageUrl
                };
              });
            }
          }
        }
      } catch (e) {
        console.warn("LeeCapAdapter: Product API fetch error, falling back to page DOM/VTT", e);
      }
    }

    // 2. Fallbacks if API data was incomplete

    // Fallback: Course Name from DOM
    if (!courseName) {
      const siteLink = document.querySelector('a[href*="/leccap/site/"], .content-header-site-btn, .course-title');
      if (siteLink && siteLink.textContent) {
        const raw = siteLink.textContent.trim();
        const m = raw.match(/([A-Z]{2,}\s+\d{3})/i);
        courseName = m ? m[1].toUpperCase() : raw.split('-')[0].trim();
      }
    }

    // Fallback: Title & Date from DOM
    if (!lectureTitle) {
      const titleEl = document.querySelector('.content-header-recording-title, .lecture-title, h1');
      if (titleEl && titleEl.textContent) {
        lectureTitle = titleEl.textContent.trim();
      }
    }

    if (!recordingDate && lectureTitle) {
      const dateMatch = lectureTitle.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (dateMatch) {
        recordingDate = `${dateMatch[3]}-${dateMatch[1].padStart(2, '0')}-${dateMatch[2].padStart(2, '0')}`;
      }
    }

    // Fallback: Captions from HTML5 textTracks or WebVTT endpoint
    if (segments.length === 0) {
      const video = document.querySelector('video') as HTMLVideoElement | null;
      if (video && video.textTracks && video.textTracks.length > 0) {
        for (let i = 0; i < video.textTracks.length; i++) {
          const track = video.textTracks[i];
          if (track.cues && track.cues.length > 0) {
            for (let j = 0; j < track.cues.length; j++) {
              const cue = track.cues[j] as VTTCue;
              const text = cue.text ? cue.text.replace(/\n/g, ' ').trim() : '';
              if (text) {
                segments.push({
                  start: cue.startTime,
                  end: cue.endTime,
                  text
                });
              }
            }
            if (segments.length > 0) break;
          }
        }
      }
    }

    // Fallback: Fetch WebVTT endpoint directly
    if (segments.length === 0 && rk) {
      try {
        const vttUrl = `/leccap/player/api/webvtt/?rk=${encodeURIComponent(rk)}`;
        const resp = await fetch(vttUrl);
        if (resp.ok) {
          const vtt = await resp.text();
          const parsed = parseVtt(vtt);
          if (parsed.length > 0) {
            segments = parsed;
          }
        }
      } catch (e) {
        console.warn("LeeCapAdapter: WebVTT fetch error", e);
      }
    }

    // Fallback: DOM transcript panel
    if (segments.length === 0) {
      const rows = document.querySelectorAll('.transcript-row');
      rows.forEach(row => {
        const textEl = row.querySelector('.transcript-text');
        if (!textEl) return;
        const text = textEl.textContent?.trim();
        if (!text) return;

        let start: number | undefined;
        const timeEl = row.querySelector('.transcript-time');
        if (timeEl && timeEl.textContent) {
          const parts = timeEl.textContent.trim().split(':').map(p => parseFloat(p));
          if (parts.length === 3) {
            start = parts[0] * 3600 + parts[1] * 60 + parts[2];
          } else if (parts.length === 2) {
            start = parts[0] * 60 + parts[1];
          }
        }

        segments.push({
          start,
          text
        });
      });
    }

    // Fallback: DOM thumbnails (applying LecCap rounding correction)
    if (markers.length === 0) {
      const thumbElements = document.querySelectorAll('.thumbnails .thumbnail, .thumbnail[role="listitem"]');
      thumbElements.forEach((el, idx) => {
        let start: number | undefined;
        const label = el.getAttribute('aria-label');
        if (label && label.startsWith('Thumbnail at')) {
          let hr = 0, min = 0, sec = 0;
          const hrMatch = label.match(/(\d+)\s*hour/);
          const minMatch = label.match(/(\d+)\s*minute/);
          const secMatch = label.match(/(\d+)\s*second/);
          if (hrMatch) hr = parseInt(hrMatch[1]);
          if (minMatch) min = parseInt(minMatch[1]);
          if (secMatch) sec = parseInt(secMatch[1]);

          // Fix LecCap bug where min was incremented if sec >= 30 without subtracting 30
          if (sec >= 30 && min > 0) {
            min -= 1;
          }
          start = hr * 3600 + min * 60 + sec;
        } else if (label && label.trim() === 'Thumbnail at') {
          start = 0;
        }

        if (start === undefined) return;

        let imageUrl: string | undefined;
        const innerDiv = el.querySelector('div');
        if (innerDiv && innerDiv.style.backgroundImage) {
          const bgMatch = innerDiv.style.backgroundImage.match(/url\(["']?(.*?)["']?\)/);
          if (bgMatch) {
            imageUrl = bgMatch[1];
            if (imageUrl.startsWith('//')) {
              imageUrl = 'https:' + imageUrl;
            }
          }
        }

        markers.push({
          start,
          type: 'slide',
          title: `Slide ${idx + 1}`,
          imageUrl
        });
      });
    }

    // Sort markers chronologically
    markers.sort((a, b) => a.start - b.start);

    if (segments.length === 0 && markers.length === 0) return null;

    return {
      segments,
      markers,
      lectureTitle,
      courseName,
      recordingDate
    };
  }
}
