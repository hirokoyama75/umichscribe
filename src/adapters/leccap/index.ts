import { ExtractionResult, TranscriptSegment, ContextMarker } from '../../core/types';

export class LeeCapAdapter {
  platform = "LeeCap";

  isMatch(url: string): boolean {
    return url.includes('leccap.engin.umich.edu');
  }

  async extract(document: Document): Promise<ExtractionResult | null> {
    const segments: TranscriptSegment[] = [];
    const markers: ContextMarker[] = [];
    let lectureTitle: string | undefined;
    let recordingDate: string | undefined;

    // Title
    const titleEl = document.querySelector('.lecture-title, h1');
    if (titleEl) {
      lectureTitle = titleEl.textContent?.trim();
    }

    // Date
    const dateEl = document.querySelector('.lecture-date, .date');
    if (dateEl) {
      recordingDate = dateEl.textContent?.trim();
    }

    // Transcript
    const cueElements = document.querySelectorAll('.transcript-cue, .transcript-row, .caption-cue');
    cueElements.forEach(el => {
      const textEl = el.querySelector('.text, .cue-text') || el;
      const text = textEl.textContent?.trim();
      if (!text) return;

      const timeAttr = el.getAttribute('data-time') || el.getAttribute('data-start');
      let start: number | undefined;
      if (timeAttr) {
        start = parseFloat(timeAttr);
      } else {
        // sometimes time is in text
        const timeText = el.querySelector('.time')?.textContent?.trim();
        if (timeText) {
           const parts = timeText.split(':');
           if (parts.length === 3) {
             start = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2]);
           } else if (parts.length === 2) {
             start = parseInt(parts[0]) * 60 + parseFloat(parts[1]);
           }
        }
      }

      const speakerEl = el.querySelector('.speaker');
      const speaker = speakerEl ? speakerEl.textContent?.trim() : undefined;

      segments.push({
        start,
        text,
        speaker
      });
    });

    // Slides/Chapters
    const slideElements = document.querySelectorAll('.slide, .chapter-marker');
    slideElements.forEach(el => {
       const timeAttr = el.getAttribute('data-time');
       if (!timeAttr) return;
       const start = parseFloat(timeAttr);
       
       const title = el.querySelector('.title, .slide-title')?.textContent?.trim();
       const text = el.querySelector('.slide-text')?.textContent?.trim();
       
       markers.push({
         start,
         type: el.classList.contains('slide') ? 'slide' : 'chapter',
         title,
         text
       });
    });

    if (segments.length === 0 && markers.length === 0) return null;

    return {
      segments,
      markers,
      lectureTitle,
      recordingDate
    };
  }
}
