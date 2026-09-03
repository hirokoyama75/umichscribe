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
    let courseName: string | undefined;

    // Title
    const titleEl = document.querySelector('.lecture-title, h1');
    if (titleEl) {
      lectureTitle = titleEl.textContent?.trim();
    }
    
    // Course Name (often in a breadcrumb or header)
    const courseEl = document.querySelector('.course-title, .breadcrumb a:nth-child(2), title');
    if (courseEl) {
       courseName = courseEl.textContent?.trim();
       if (courseName && courseName.includes('-')) {
          courseName = courseName.split('-')[0].trim(); // sometimes "Stats 250 - Fall 2024"
       }
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
    const slideElements = document.querySelectorAll('.slide, .chapter-marker, .thumbnail');
    slideElements.forEach(el => {
       const timeAttr = el.getAttribute('data-time');
       let start: number | undefined;
       
       if (timeAttr) {
         start = parseFloat(timeAttr);
       } else if (el.classList.contains('thumbnail')) {
         // aria-label="Thumbnail at 2 minutes 35 seconds"
         const label = el.getAttribute('aria-label');
         if (label && label.startsWith('Thumbnail at')) {
           let min = 0, sec = 0, hr = 0;
           const hrMatch = label.match(/(\d+)\s*hour/);
           const minMatch = label.match(/(\d+)\s*minute/);
           const secMatch = label.match(/(\d+)\s*second/);
           if (hrMatch) hr = parseInt(hrMatch[1]);
           if (minMatch) min = parseInt(minMatch[1]);
           if (secMatch) sec = parseInt(secMatch[1]);
           start = hr * 3600 + min * 60 + sec;
         } else if (label && label.trim() === 'Thumbnail at') {
           start = 0; // The first one sometimes just says "Thumbnail at " (time 0)
         }
       }
       
       if (start === undefined) return;
       
       const title = el.querySelector('.title, .slide-title')?.textContent?.trim();
       const text = el.querySelector('.slide-text')?.textContent?.trim();
       
       markers.push({
         start,
         type: (el.classList.contains('slide') || el.classList.contains('thumbnail')) ? 'slide' : 'chapter',
         title: title || `Slide`, // fallback title
         text
       });
    });

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
