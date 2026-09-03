import { TranscriptSegment } from './types';

export function parseVtt(vtt: string): TranscriptSegment[] {
  const lines = vtt.split('\n');
  const segments: TranscriptSegment[] = [];
  let currentStart = 0;
  let currentEnd = 0;
  let currentText: string[] = [];
  let currentSpeaker: string | undefined;

  const timeRegex = /(?:(\d+):)?(\d+):(\d+\.\d+) --> (?:(\d+):)?(\d+):(\d+\.\d+)/;

  const pushCurrent = () => {
    if (currentText.length > 0) {
      let text = currentText.join(' ');
      const speakerMatch = text.match(/<v\s+([^>]+)>(.*)/s);
      if (speakerMatch) {
        currentSpeaker = speakerMatch[1];
        text = speakerMatch[2];
      }
      text = text.replace(/<[^>]+>/g, '').trim();
      if (text) {
        segments.push({
          start: currentStart,
          end: currentEnd,
          text: text,
          speaker: currentSpeaker
        });
      }
      currentText = [];
      currentSpeaker = undefined;
    }
  };

  for (let line of lines) {
    line = line.trim();
    if (!line || line === 'WEBVTT' || line.startsWith('NOTE') || /^\d+$/.test(line)) {
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
